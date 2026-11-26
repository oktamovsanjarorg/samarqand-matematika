import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import {
  EXPIRING_DAYS,
  type AdminStudentPatch,
  type AdminStudentRow,
  type StudentFilter,
} from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { AuditService } from "../audit/audit.service";
import { acceptedText, accessModeText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

const SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  phone: true,
  createdAt: true,
  lastSeenAt: true,
  isBlocked: true,
  blockedReason: true,
  student: {
    select: {
      fullName: true,
      accessMode: true,
      acceptedAt: true,
      groupId: true,
      group: { select: { name: true } },
      parents: {
        where: { status: { not: "REJECTED" } },
        orderBy: { createdAt: "asc" },
        select: { phone: true, status: true },
      },
    },
  },
  // Eng oxirgi tugaydigan obuna: hozirdan keyin bo'lsa faol (T-110)
  subscriptions: { orderBy: { endsAt: "desc" }, take: 1, select: { endsAt: true } },
} as const;
type Row = Prisma.UserGetPayload<{ select: typeof SELECT }>;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const activeUntil = (u: Row) => {
  const end = u.subscriptions[0]?.endsAt;
  return end && end > new Date() ? end.toISOString() : null;
};

/** Filtr sharti: "unpaid" — pullik rejimda qabul qilingan, lekin hozir faol obunasi yo'q */
export function filterWhere(filter: StudentFilter, now = new Date()): Prisma.UserWhereInput {
  // Bloklangan begona "yangi" ro'yxatida qolmaydi (T-185)
  if (filter === "new")
    return { isBlocked: false, OR: [{ student: null }, { student: { acceptedAt: null } }] };
  if (filter === "expiring") {
    const until = new Date(now.getTime() + EXPIRING_DAYS * 86_400_000);
    return {
      student: { acceptedAt: { not: null }, accessMode: "AUTO" },
      subscriptions: { some: { endsAt: { gt: now, lte: until } }, none: { endsAt: { gt: until } } },
    };
  }
  if (filter === "unpaid")
    return {
      student: { acceptedAt: { not: null }, accessMode: "AUTO" },
      subscriptions: { none: { endsAt: { gt: new Date() } } },
    };
  return {};
}

type Attendance30 = AdminStudentRow["attendance30"];
const NO_ATTENDANCE: Attendance30 = { present: 0, absent: 0, total: 0 };

const parentsBy = (u: Row, status: "APPROVED" | "PENDING") =>
  (u.student?.parents ?? []).filter((p) => p.status === status);

/** T-185: guruh, bloklash, kutilayotgan ota-ona va davomat */
const extras = (u: Row, att: Attendance30) => ({
  groupId: u.student?.groupId ?? null,
  blocked: u.isBlocked,
  blockedReason: u.blockedReason,
  parentsPending: parentsBy(u, "PENDING").length,
  attendance30: att,
});

const toRow = (u: Row, att = NO_ATTENDANCE): AdminStudentRow => ({
  id: u.id,
  telegramName: [u.firstName, u.lastName].filter(Boolean).join(" "),
  username: u.username,
  fullName: u.student?.fullName ?? null,
  phone: u.phone,
  accessMode: u.student?.accessMode ?? "AUTO",
  acceptedAt: iso(u.student?.acceptedAt),
  groupName: u.student?.group?.name ?? null,
  paidUntil: activeUntil(u),
  parentPhones: parentsBy(u, "APPROVED").map((p) => p.phone),
  createdAt: u.createdAt.toISOString(),
  lastSeenAt: iso(u.lastSeenAt),
  ...extras(u, att),
});

/** Guruh: "" hammasi, "none" guruhsiz (online), aks holda guruh id */
export function groupWhere(groupId?: string): Prisma.UserWhereInput {
  if (!groupId) return {};
  if (groupId === "none") return { OR: [{ student: null }, { student: { groupId: null } }] };
  return { student: { groupId } };
}

/** Ustoz va yordamchi: o'quvchilar ro'yxati, qabul qilish, kirish rejimi (BR-S03) */
@Injectable()
export class AdminStudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
    private readonly notify: NotifyService,
  ) {}

  /** filter "new": ustoz hali qabul qilmaganlar, "unpaid": to'lamaganlar. q: ism, username yoki telefon */
  async list(filter: StudentFilter, q?: string, groupId?: string): Promise<AdminStudentRow[]> {
    const text = q?.trim();
    const where: Prisma.UserWhereInput = {
      role: "STUDENT",
      AND: [filterWhere(filter), groupWhere(groupId)],
      ...(text
        ? {
            OR: [
              { student: { fullName: { contains: text, mode: "insensitive" } } },
              { firstName: { contains: text, mode: "insensitive" } },
              { username: { contains: text, mode: "insensitive" } },
              { phone: { contains: text.replace(/\s/g, "") } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.user.findMany({
      where,
      select: SELECT,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const att = await this.attendance30(rows.map((r) => r.id));
    return rows.map((r) => toRow(r, att.get(r.id)));
  }

  /** Oxirgi 30 kun davomati: keldi va kechikdi "keldi", kelmadi; sababli jamiga kiradi */
  private async attendance30(userIds: string[]): Promise<Map<string, Attendance30>> {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const rows = await this.prisma.attendance.groupBy({
      by: ["userId", "status"],
      where: { userId: { in: userIds }, date: { gte: since } },
      _count: { _all: true },
    });
    const out = new Map<string, Attendance30>();
    for (const r of rows) {
      const cur = out.get(r.userId) ?? { present: 0, absent: 0, total: 0 };
      const n = r._count._all;
      cur.total += n;
      if (r.status === "PRESENT" || r.status === "LATE") cur.present += n;
      if (r.status === "ABSENT") cur.absent += n;
      out.set(r.userId, cur);
    }
    return out;
  }

  /** Qabul: groupId berilsa shu guruhga qo'shiladi, null bo'lsa online (guruhsiz) qoladi */
  async accept(actorId: string, id: string, groupId?: string | null): Promise<AdminStudentRow> {
    await this.mustStudent(id);
    if (groupId && !(await this.prisma.group.count({ where: { id: groupId, isActive: true } })))
      throw new NotFoundException("Guruh topilmadi");
    const now = new Date();
    const group = groupId === undefined ? {} : { groupId };
    await this.prisma.studentProfile.upsert({
      where: { userId: id },
      update: { acceptedAt: now, acceptedById: actorId, ...group },
      create: { userId: id, acceptedAt: now, acceptedById: actorId, ...group },
    });
    await this.audit.log({
      actorId,
      action: "student.accept",
      entity: "User",
      entityId: id,
      data: { groupId: groupId ?? null },
    });
    await this.notify.toUser(
      id,
      acceptedText(await this.access.facts(id)),
      this.notify.appButton("Ilovani ochish", ""),
    );
    return this.get(id);
  }

  async update(actorId: string, id: string, patch: AdminStudentPatch): Promise<AdminStudentRow> {
    await this.mustStudent(id);
    const before = (await this.access.facts(id)).mode;
    await this.prisma.studentProfile.upsert({
      where: { userId: id },
      update: patch,
      create: { userId: id, ...patch },
    });
    // Ism shaxsiy ma'lumot: auditga faqat o'zgargan maydon nomi va kirish rejimi yoziladi
    await this.audit.log({
      actorId,
      action: "student.update",
      entity: "User",
      entityId: id,
      data: { fields: Object.keys(patch), ...(patch.accessMode ? { accessMode: patch.accessMode } : {}) },
    });
    const text =
      patch.accessMode && patch.accessMode !== before ? accessModeText[patch.accessMode] : undefined;
    if (text) await this.notify.toUser(id, text);
    return this.get(id);
  }

  /** Bloklash: ilovaga va botga kira olmaydi (AuthGuard). Sabab faqat ustozga ko'rinadi */
  async block(actorId: string, id: string, blocked: boolean, reason?: string | null) {
    await this.mustStudent(id);
    await this.prisma.user.update({
      where: { id },
      data: { isBlocked: blocked, blockedReason: blocked ? (reason ?? null) : null },
    });
    await this.audit.log({
      actorId,
      action: blocked ? "student.block" : "student.unblock",
      entity: "User",
      entityId: id,
    });
    return this.get(id);
  }

  /** Begonani o'chirish: faqat hali qabul qilinmagan o'quvchi (qabul qilingan bo'lsa bloklanadi) */
  async remove(actorId: string, id: string) {
    await this.mustStudent(id);
    const accepted = await this.prisma.studentProfile.count({
      where: { userId: id, acceptedAt: { not: null } },
    });
    if (accepted) throw new ConflictException("Qabul qilingan oʻquvchi oʻchirilmaydi: bloklang");
    await this.prisma.user.delete({ where: { id } });
    await this.audit.log({ actorId, action: "student.delete", entity: "User", entityId: id });
  }

  async get(id: string): Promise<AdminStudentRow> {
    await this.mustStudent(id);
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: SELECT });
    return toRow(u, (await this.attendance30([id])).get(id));
  }

  private async mustStudent(id: string) {
    if (!(await this.prisma.user.count({ where: { id, role: "STUDENT" } })))
      throw new NotFoundException("Oʻquvchi topilmadi");
  }
}
