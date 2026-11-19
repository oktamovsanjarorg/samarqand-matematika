import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import { LOGIN_TOKEN_TTL_MS, STAFF_ROLES, type AuthResponse, type TelegramProfile } from "@samarqand/shared";
import { createHash, randomBytes } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const EXPIRED = "Havola eskirgan yoki ishlatilgan. Botga /admin deb qayta yozing.";

/** Admin panelga kirish: bot /admin → bir martalik havola (5 daqiqa) → admin JWT */
@Injectable()
export class AdminLoginService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  /** Xodim uchun havola yaratadi. Xodim bo'lmasa yoki bloklangan bo'lsa null. Bazada faqat token xeshi saqlanadi. */
  async createLink(tg: TelegramProfile): Promise<string | null> {
    const user = await this.users.upsertFromTelegram(tg);
    if (user.isBlocked || !STAFF_ROLES.includes(user.role)) return null;
    const token = randomBytes(32).toString("base64url");
    await this.prisma.loginToken.create({
      data: {
        tokenHash: sha256(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
      },
    });
    return `${this.env.ADMIN_URL.replace(/\/$/, "")}/login#t=${token}`;
  }

  /** Havoladagi tokenni JWT'ga almashtiradi. Token faqat bir marta ishlaydi. */
  async consume(token: string): Promise<AuthResponse> {
    const row = await this.prisma.loginToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) throw new UnauthorizedException(EXPIRED);
    // Bir vaqtda kelgan ikki so'rovdan faqat birinchisi o'tadi
    const { count } = await this.prisma.loginToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) throw new UnauthorizedException(EXPIRED);
    if (row.user.isBlocked || !STAFF_ROLES.includes(row.user.role))
      throw new ForbiddenException("Ruxsat yoʻq");

    const expiresIn = this.env.ADMIN_JWT_TTL;
    const jwt = await this.jwt.signAsync(
      { sub: row.user.id, role: row.user.role },
      { expiresIn: expiresIn as JwtSignOptions["expiresIn"] },
    );
    await this.audit.log({
      actorId: row.user.id,
      action: "admin.login",
      entity: "User",
      entityId: row.user.id,
    });
    return { token: jwt, expiresIn, user: await this.users.me(row.user.id) };
  }
}
