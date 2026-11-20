import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { User } from "@samarqand/db";
import type { Me } from "@samarqand/shared";
import type { TelegramInitUser } from "@samarqand/shared/server";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";

const normUsername = (u?: string | null) => (u ? u.replace(/^@/, "").trim().toLowerCase() : "");

@Injectable()
export class UsersService {
  private readonly owners: Set<string>;
  private readonly ownerIds: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) env: Env,
  ) {
    this.owners = new Set(env.OWNER_USERNAMES.split(",").map(normUsername).filter(Boolean));
    this.ownerIds = new Set(
      env.OWNER_TELEGRAM_IDS.split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    );
  }

  /** Telegram profilidan foydalanuvchini yaratadi yoki yangilaydi. OWNER_TELEGRAM_IDS va OWNER_USERNAMES dagilar TEACHER bo'ladi. */
  async upsertFromTelegram(tg: TelegramInitUser): Promise<User> {
    const profile = {
      firstName: tg.first_name,
      lastName: tg.last_name ?? null,
      username: tg.username ?? null,
    };
    const isOwner = this.ownerIds.has(String(tg.id)) || this.owners.has(normUsername(tg.username));
    return this.prisma.user.upsert({
      where: { telegramId: BigInt(tg.id) },
      update: { ...profile, lastSeenAt: new Date(), ...(isOwner ? { role: "TEACHER" } : {}) },
      create: {
        telegramId: BigInt(tg.id),
        ...profile,
        lastSeenAt: new Date(),
        role: isOwner ? "TEACHER" : "STUDENT",
      },
    });
  }

  async me(id: string): Promise<Me> {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    return { id: u.id, firstName: u.firstName, lastName: u.lastName, username: u.username, role: u.role };
  }
}
