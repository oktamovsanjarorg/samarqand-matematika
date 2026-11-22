import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { PERSON_SELECT, personName } from "../common/person";
import {
  subscriptionEndedText,
  subscriptionEndingParentText,
  subscriptionEndingText,
} from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

const DAY = 24 * 60 * 60 * 1000;
/** Necha kun oldin eslatiladi */
export const RENEW_REMINDER_DAYS = 3;

type Due = { id: string; userId: string; endsAt: Date };

/**
 * Obuna tugashi (T-090, BR-B06): 3 kun qolganda o'quvchi va tasdiqlangan ota-onaga, tugaganda o'quvchiga.
 * Faqat foydalanuvchining eng oxirgi obunasi hisobga olinadi (uzaytirilgan bo'lsa eslatma yo'q),
 * tekshirilayotgan chek bo'lsa ham yuborilmaydi. Har bosqich bir marta (shartli updateMany).
 */
@Injectable()
export class SubscriptionReminders implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("Subscription");
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
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
    const soon = await this.due(1, { gt: now, lte: new Date(now.getTime() + RENEW_REMINDER_DAYS * DAY) });
    for (const s of soon)
      if (await this.claim(s, 1)) {
        await this.notify.toUser(s.userId, subscriptionEndingText(s.endsAt), this.renew());
        await this.toParents(s);
      }
    // Bir kundan eski tugaganlar (masalan server o'chiq turgan bo'lsa) endi eslatilmaydi
    const ended = await this.due(2, { gt: new Date(now.getTime() - DAY), lte: now });
    for (const s of ended)
      if (await this.claim(s, 2)) await this.notify.toUser(s.userId, subscriptionEndedText, this.renew());
  }

  /** Bosqichi hali yuborilmagan, AUTO rejimdagi faol o'quvchining eng oxirgi obunasi */
  private async due(stage: 1 | 2, endsAt: { gt: Date; lte: Date }): Promise<Due[]> {
    const rows = await this.prisma.subscription.findMany({
      where: {
        reminderStage: { lt: stage },
        endsAt,
        user: {
          role: "STUDENT",
          isBlocked: false,
          student: { accessMode: "AUTO" },
          payments: { none: { status: "PENDING" } },
        },
      },
      select: { id: true, userId: true, endsAt: true },
    });
    if (!rows.length) return [];
    const latest = await this.prisma.subscription.groupBy({
      by: ["userId"],
      where: { userId: { in: rows.map((r) => r.userId) } },
      _max: { endsAt: true },
    });
    const last = new Map(latest.map((l) => [l.userId, l._max.endsAt?.getTime() ?? 0]));
    return rows.filter((r) => r.endsAt.getTime() >= (last.get(r.userId) ?? 0));
  }

  private renew() {
    return this.notify.appButton("Obunani uzaytirish", "billing");
  }

  private async claim(s: Due, stage: 1 | 2): Promise<boolean> {
    const r = await this.prisma.subscription.updateMany({
      where: { id: s.id, reminderStage: { lt: stage } },
      data: { reminderStage: stage },
    });
    return r.count > 0;
  }

  private async toParents(s: Due) {
    const links = await this.prisma.parentLink.findMany({
      where: { status: "APPROVED", student: { userId: s.userId } },
      select: { parentId: true, studentId: true, student: { select: { user: { select: PERSON_SELECT } } } },
    });
    // T-122: ota-ona farzandi uchun o'zi to'lay oladi (BR-B07)
    await Promise.all(
      links.map((l) =>
        this.notify.toUser(
          l.parentId,
          subscriptionEndingParentText(personName(l.student.user), s.endsAt),
          this.notify.appButton("Obunani toʻlash", `children/${l.studentId}/billing`),
        ),
      ),
    );
  }
}
