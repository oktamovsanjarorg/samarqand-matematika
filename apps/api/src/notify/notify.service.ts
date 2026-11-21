import { Inject, Injectable } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { TELEGRAM_TRANSPORT, type LinkButton, type TelegramTransport } from "./telegram-transport";

/** Telegram HTML uchun: foydalanuvchi kiritgan matn teg bo'lib ketmasin */
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Bot nomidan xabarlar (T-027). Hech qachon xato tashlamaydi: xabar ketmasa ham asosiy amal bajariladi.
 * Shaxsiy ma'lumot (telefon, ism) faqat xabarning o'zida, logga yozilmaydi.
 */
@Injectable()
export class NotifyService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TELEGRAM_TRANSPORT) private readonly transport: TelegramTransport,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Admin paneldagi sahifaga tugma */
  adminButton(text: string, path: string): LinkButton {
    return { text, url: `${this.env.ADMIN_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}` };
  }

  /** Mini App sahifasini Telegram ichida ochadigan tugma (T-093). MINIAPP_URL bo'lmasa tugma yo'q */
  appButton(text: string, path: string): LinkButton | undefined {
    const base = this.env.MINIAPP_URL?.replace(/\/$/, "");
    return base ? { text, url: `${base}/${path.replace(/^\//, "")}`, webApp: true } : undefined;
  }

  /** Barcha faol ustoz va yordamchilarga */
  async toStaff(html: string, button?: LinkButton): Promise<void> {
    const staff = await this.prisma.user.findMany({
      where: { role: { in: ["TEACHER", "ASSISTANT"] }, isBlocked: false },
      select: { telegramId: true },
    });
    await Promise.all(staff.map((s) => this.transport.send(s.telegramId, html, button)));
  }

  async toUser(userId: string, html: string, button?: LinkButton): Promise<void> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
    if (u) await this.transport.send(u.telegramId, html, button);
  }
}
