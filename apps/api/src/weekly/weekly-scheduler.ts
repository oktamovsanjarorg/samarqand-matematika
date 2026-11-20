import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { AccessService } from "../access/access.service";
import { ENV, type Env } from "../config/env";
import { weeklyReminderText, weeklyResultText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

const HOUR = 60 * 60 * 1000;

/**
 * Haftalik test rejalashtiruvchisi: eslatmalar (BR-W07) va oynani yopish (BR-W03, W08).
 * Har amal bazada "egallab olinadi" (updateMany shart bilan), shuning uchun ikki marta bajarilmaydi.
 */
@Injectable()
export class WeeklyScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("Weekly");
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notify: NotifyService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit() {
    if (this.env.WEEKLY_TICK_SEC === 0) return;
    this.timer = setInterval(() => {
      this.tick(new Date()).catch((e: unknown) =>
        this.log.warn(`tick: ${e instanceof Error ? e.name : "xato"}`),
      );
    }, this.env.WEEKLY_TICK_SEC * 1000);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async tick(now: Date) {
    await this.remind(now);
    await this.close(now);
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

  /** Oyna yopildi: topshirganga ball = to'g'rilar, topshirmaganga 0; har ishlaganga natija xabari */
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
    }
  }
}
