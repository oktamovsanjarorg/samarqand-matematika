import { Injectable } from "@nestjs/common";
import {
  STAFF_INVITE_TTL_MS,
  type StaffInvite,
  type StaffInviteStatus,
  type TelegramProfile,
} from "@samarqand/shared";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { personName, PERSON_SELECT } from "../common/person";
import { esc, NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

export const INVITE_KEY = "staff:invite";
const sha256 = (s: string) => createHash("sha256").update(s).digest();

interface Stored {
  hash: string;
  expiresAt: string;
}

/**
 * Yordamchini havola bilan taklif qilish (T-155, BR-A05): ustoz havola yaratadi va yuboradi,
 * odam uni botda ochsa yordamchi bo'ladi. Oldin botga kirgan bo'lishi shart emas.
 * Bazada (AppSetting) faqat kod xeshi; yangi havola eskisini bekor qiladi; ishlatilgach o'chadi.
 */
@Injectable()
export class StaffInviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly audit: AuditService,
    private readonly notify: NotifyService,
  ) {}

  async create(actorId: string, now = new Date()): Promise<StaffInvite> {
    const code = randomBytes(16).toString("base64url");
    const expiresAt = new Date(now.getTime() + STAFF_INVITE_TTL_MS).toISOString();
    const value = { hash: sha256(code).toString("hex"), expiresAt } satisfies Stored;
    await this.prisma.appSetting.upsert({
      where: { key: INVITE_KEY },
      create: { key: INVITE_KEY, value },
      update: { value },
    });
    await this.audit.log({ actorId, action: "staff.invite", entity: "User", entityId: actorId });
    const bot = await this.notify.botLink();
    return { link: bot ? `${bot}?start=s_${code}` : null, code, expiresAt };
  }

  async cancel(actorId: string): Promise<void> {
    const { count } = await this.prisma.appSetting.deleteMany({ where: { key: INVITE_KEY } });
    if (count)
      await this.audit.log({ actorId, action: "staff.invite.cancel", entity: "User", entityId: actorId });
  }

  /** Bot chaqiradi: kodni tekshiradi va foydalanuvchini yordamchi qiladi */
  async use(tg: TelegramProfile, code: string, now = new Date()): Promise<StaffInviteStatus> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: INVITE_KEY } });
    const stored = row?.value as Stored | undefined;
    if (!row || !stored || !this.matches(stored, code, now)) return "invalid";
    const user = await this.users.upsertFromTelegram(tg);
    if (user.isBlocked) return "blocked";
    if (user.role === "TEACHER") return "teacher";
    if (user.role === "ASSISTANT") return "already";
    if (user.role === "PARENT") return "parent";
    // Bir vaqtda ikki kishi ochsa faqat birinchisi o'tadi
    const { count } = await this.prisma.appSetting.deleteMany({
      where: { key: INVITE_KEY, updatedAt: row.updatedAt },
    });
    if (!count) return "invalid";
    // Xodimlarga xabar rol o'zgarishidan oldin: yangi yordamchining o'ziga bormaydi
    const p = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: PERSON_SELECT });
    await this.notify.toStaff(`🧑‍🏫 <b>${esc(personName(p))}</b> taklif havolasi orqali yordamchi boʻldi`);
    await this.prisma.user.updateMany({
      where: { id: user.id, role: "STUDENT" },
      data: { role: "ASSISTANT" },
    });
    await this.audit.log({ actorId: user.id, action: "staff.add", entity: "User", entityId: user.id });
    return "ok";
  }

  private matches(stored: Stored, code: string, now: Date): boolean {
    if (new Date(stored.expiresAt) <= now) return false;
    const a = Buffer.from(stored.hash, "hex");
    const b = sha256(code);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
