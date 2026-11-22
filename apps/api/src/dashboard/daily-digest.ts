import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Prisma } from "@samarqand/db";
import { Ticker } from "../common/ticker";
import { tashkentDayStart } from "../common/time";
import { ENV, type Env } from "../config/env";
import { dailyDigestText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { DashboardService } from "./dashboard.service";

const HOUR = 3_600_000;
/** Toshkent vaqti bilan shu soatdan keyin yuboriladi */
export const DIGEST_HOUR = 8;

/**
 * Ertalabki xulosa (T-139): ustoz va yordamchilarga kutayotgan ishlar soni (yangi o'quvchilar, cheklar,
 * ota-ona so'rovlari, tekshirilmagan yechimlar). Admin'ni ochmasdan nima kutayotgani ko'rinadi.
 * Kuniga bir marta: AppSetting'dagi "digest:<sana>" kaliti egallanadi (ikki nusxa bo'lsa ham bitta xabar).
 * Ish bo'lmasa xabar yuborilmaydi.
 */
@Injectable()
export class DailyDigest implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("Digest");
  private readonly ticker = new Ticker(this.log);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly notify: NotifyService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit() {
    this.ticker.start(this.env.WEEKLY_TICK_SEC, () => this.tick(new Date()));
  }

  onModuleDestroy() {
    return this.ticker.stop();
  }

  /** true: shu tick'da xulosa yuborildi */
  async tick(now: Date): Promise<boolean> {
    const dayStart = tashkentDayStart(now);
    if (now.getTime() - dayStart.getTime() < DIGEST_HOUR * HOUR) return false;
    const day = new Date(dayStart.getTime() + 5 * HOUR).toISOString().slice(0, 10);
    if (!(await this.claim(day))) return false;
    const text = dailyDigestText((await this.dashboard.get(now)).todo);
    if (!text) return false;
    await this.notify.toStaff(text, this.notify.adminButton("Admin panelni ochish", "/"));
    return true;
  }

  private async claim(day: string): Promise<boolean> {
    const key = `digest:${day}`;
    try {
      await this.prisma.appSetting.create({ data: { key, value: true } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
      throw e;
    }
    await this.prisma.appSetting.deleteMany({ where: { key: { startsWith: "digest:", lt: key } } });
    return true;
  }
}
