import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { AccessService } from "../access/access.service";
import { ENV, type Env } from "../config/env";
import { weeklyOpenText, weeklyReminderText, weeklyResultText, weeklyStaffSummary } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { AiReviewService } from "./ai-reviews";
import { ParentReportService } from "./parent-report";
import { RANKED } from "../common/ranked";

const HOUR = 60 * 60 * 1000;

/**
 * Haftalik test rejalashtiruvchisi: eslatmalar (BR-W07), oynani yopish (BR-W03, W08) va AI tekshiruvi navbati (T-033).
 * Har amal bazada "egallab olinadi" (updateMany shart bilan), shuning uchun ikki marta bajarilmaydi.
 */
@Injectable()
export class WeeklyScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("Weekly");
  private timer?: NodeJS.Timeout;
  private busy = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notify: NotifyService,
    private readonly reviews: AiReviewService,
    private readonly parents: ParentReportService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit() {
    if (this.env.WEEKLY_TICK_SEC === 0) return;
    // AI tekshiruvi daqiqadan uzoq cho'zilishi mumkin: oldingi tick tugamaguncha yangisi boshlanmaydi
    this.timer = setInterval(() => {
      if (this.busy) return;
      this.busy = true;
      this.tick(new Date())
        .catch((e: unknown) => this.log.warn(`tick: ${e instanceof Error ? e.name : "xato"}`))
        .finally(() => (this.busy = false));
    }, this.env.WEEKLY_TICK_SEC * 1000);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async tick(now: Date) {
    await this.announce(now);
    await this.remind(now);
    await this.close(now);
    await this.reviews.process(now);
  }

  /** Oyna ochildi: to'liq kirishli o'quvchilarga bir marta xabar (T-080) */
  async announce(now: Date) {
    const due = await this.prisma.weeklyTest.findMany({
      where: { isPublished: true, announcedAt: null, opensAt: { lte: now }, closesAt: { gt: now } },
      select: { id: true, title: true, closesAt: true },
    });
    for (const t of due) {
      const claimed = await this.prisma.weeklyTest.updateMany({
        where: { id: t.id, announcedAt: null },
        data: { announcedAt: now },
      });
      if (!claimed.count) continue;
      const to = await this.access.fullAccessStudentIds();
      await Promise.all(to.map((id) => this.notify.toUser(id, weeklyOpenText(t.title, t.closesAt))));
    }
  }

  /** 24 va 3 soat qolganda topshirmagan, to'liq kirishli o'quvchilarga */
  async remind(now: Date) {
    const due = await this.prisma.weeklyTest.findMany({
      where: {
        isPublished: true,
        closedAt: null,
        opensAt: { lte: now },
        closesAt: { gt: now, lte: new Date(now.getTime() + 24 * HOUR) },
        reminderStage: { lt: 2 },
      },
      select: { id: true, title: true, closesAt: true, reminderStage: true },
    });
    for (const t of due) {
      const stage = t.closesAt.getTime() - now.getTime() <= 3 * HOUR ? 2 : 1;
      if (t.reminderStage >= stage) continue;
      const claimed = await this.prisma.weeklyTest.updateMany({
        where: { id: t.id, reminderStage: t.reminderStage },
        data: { reminderStage: stage },
      });
      if (!claimed.count) continue;
      const done = await this.prisma.weeklyAttempt.findMany({
        where: { weeklyTestId: t.id, submittedAt: { not: null } },
        select: { userId: true },
      });
      const skip = new Set(done.map((d) => d.userId));
      const to = (await this.access.fullAccessStudentIds()).filter((id) => !skip.has(id));
      await Promise.all(
        to.map((id) => this.notify.toUser(id, weeklyReminderText(t.title, stage === 2 ? 3 : 24))),
      );
    }
  }

  /** Oyna yopildi: topshirganga ball = to'g'rilar, topshirmaganga 0; har ishlaganga natija, ota-onaga hisobot */
  async close(now: Date) {
    const due = await this.prisma.weeklyTest.findMany({
      where: { isPublished: true, closedAt: null, closesAt: { lte: now } },
      select: { id: true, title: true, _count: { select: { questions: true } } },
    });
    for (const t of due) {
      const claimed = await this.prisma.weeklyTest.updateMany({
        where: { id: t.id, closedAt: null },
        data: { closedAt: now },
      });
      if (!claimed.count) continue;
      await this.prisma.weeklyAttempt.updateMany({
        where: { weeklyTestId: t.id, submittedAt: null, score: null },
        data: { score: 0 },
      });
      await this.prisma
        .$executeRaw`UPDATE "WeeklyAttempt" SET "score" = COALESCE("correct", 0) WHERE "weeklyTestId" = ${t.id} AND "score" IS NULL`;
      const rows = await this.prisma.weeklyAttempt.findMany({
        where: { weeklyTestId: t.id },
        select: { userId: true, score: true },
      });
      await Promise.all(
        rows.map((r) =>
          this.notify.toUser(r.userId, weeklyResultText(t.title, r.score ?? 0, t._count.questions)),
        ),
      );
      await this.parents.send({ id: t.id, title: t.title, total: t._count.questions });
      await this.staffSummary(t.id, t.title);
    }
  }

  /** Ustozga qisqa hisobot va tekshirish navbatiga tugma (T-084) */
  private async staffSummary(id: string, title: string) {
    const done = { attempt: { weeklyTestId: id, submittedAt: { not: null } }, reviewedAt: null };
    const [submitted, eligible, toReview, suspected] = await Promise.all([
      this.prisma.weeklyAttempt.count({ where: { weeklyTestId: id, submittedAt: { not: null }, ...RANKED } }),
      this.access.fullAccessStudentIds().then((ids) => ids.length),
      this.prisma.weeklyAnswer.count({
        where: { ...done, OR: [{ result: "MANUAL" }, { aiReview: { suspected: true } }] },
      }),
      this.prisma.weeklyAnswer.count({ where: { ...done, aiReview: { suspected: true } } }),
    ]);
    await this.notify.toStaff(
      weeklyStaffSummary(title, { submitted, eligible: Math.max(eligible, submitted), toReview, suspected }),
      this.notify.adminButton("Tekshirish navbati", `weekly/${id}/review`),
    );
  }
}
