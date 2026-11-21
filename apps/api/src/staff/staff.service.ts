import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { StaffRow } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PERSON_SELECT, personName } from "../common/person";
import { staffAddedText, staffRemovedText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

const SELECT = { id: true, username: true, role: true, lastSeenAt: true, ...PERSON_SELECT } as const;

/**
 * Yordamchilar (T-086, BR-A05): ustoz o'quvchini yordamchi qiladi va qaytaradi.
 * Ustozlar (egalar) faqat .env dagi OWNER_* bilan belgilanadi, bu yerdan o'zgarmaydi.
 * Rol har so'rovda bazadan olinadi (BR-A03), shuning uchun o'zgarish darhol kuchga kiradi.
 */
@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notify: NotifyService,
  ) {}

  async list(): Promise<StaffRow[]> {
    const rows = await this.prisma.user.findMany({
      where: { role: { in: ["TEACHER", "ASSISTANT"] }, isBlocked: false },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: SELECT,
    });
    return rows.map((u) => ({
      id: u.id,
      name: personName(u),
      username: u.username,
      role: u.role === "TEACHER" ? "TEACHER" : "ASSISTANT",
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    }));
  }

  async add(actorId: string, userId: string): Promise<StaffRow[]> {
    await this.change(userId, "STUDENT", "ASSISTANT");
    await this.audit.log({ actorId, action: "staff.add", entity: "User", entityId: userId });
    await this.notify.toUser(userId, staffAddedText);
    return this.list();
  }

  async remove(actorId: string, userId: string): Promise<StaffRow[]> {
    await this.change(userId, "ASSISTANT", "STUDENT");
    await this.audit.log({ actorId, action: "staff.remove", entity: "User", entityId: userId });
    await this.notify.toUser(userId, staffRemovedText);
    return this.list();
  }

  /** Faqat kutilgan roldan o'tkazadi: ustoz yoki ota-onaga tegilmaydi */
  private async change(id: string, from: "STUDENT" | "ASSISTANT", to: "STUDENT" | "ASSISTANT") {
    const u = await this.prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!u) throw new NotFoundException("Foydalanuvchi topilmadi");
    const done = await this.prisma.user.updateMany({ where: { id, role: from }, data: { role: to } });
    if (!done.count)
      throw new ConflictException(
        from === "STUDENT"
          ? "Faqat oʻquvchini yordamchi qilish mumkin"
          : "Bu foydalanuvchi yordamchi emas (ustozni bu yerdan oʻzgartirib boʻlmaydi)",
      );
  }
}
