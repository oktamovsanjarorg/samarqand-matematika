import { Injectable, NotFoundException } from "@nestjs/common";
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
  student: {
    select: {
      fullName: true,
      accessMode: true,
      acceptedAt: true,
      group: { select: { name: true } },
      parents: { where: { status: "APPROVED" }, orderBy: { createdAt: "asc" }, select: { phone: true } },
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
  if (filter === "new") return { OR: [{ student: null }, { student: { acceptedAt: null } }] };
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

const toRow = (u: Row): AdminStudentRow => ({
  id: u.id,
  telegramName: [u.firstName, u.lastName].filter(Boolean).join(" "),
  username: u.username,
  fullName: u.student?.fullName ?? null,
  phone: u.phone,
  accessMode: u.student?.accessMode ?? "AUTO",
  acceptedAt: iso(u.student?.acceptedAt),
  groupName: u.student?.group?.name ?? null,
  paidUntil: activeUntil(u),
  parentPhones: u.student?.parents.map((p) => p.phone) ?? [],
  createdAt: u.createdAt.toISOString(),
  lastSeenAt: iso(u.lastSeenAt),
});

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
  async list(filter: StudentFilter, q?: string): Promise<AdminStudentRow[]> {
    const text = q?.trim();
    const where: Prisma.UserWhereInput = {
      role: "STUDENT",
      ...filterWhere(filter),
      ...(text
        ? {
            AND: [
              {
                OR: [
                  { student: { fullName: { contains: text, mode: "insensitive" } } },
                  { firstName: { contains: text, mode: "insensitive" } },
                  { username: { contains: text, mode: "insensitive" } },
                  { phone: { contains: text.replace(/\s/g, "") } },
                ],
              },
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
    return rows.map(toRow);
  }

  async accept(actorId: string, id: string): Promise<AdminStudentRow> {
    await this.mustStudent(id);
    const now = new Date();
    await this.prisma.studentProfile.upsert({
      where: { userId: id },
      update: { acceptedAt: now, acceptedById: actorId },
      create: { userId: id, acceptedAt: now, acceptedById: actorId },
    });
    await this.audit.log({ actorId, action: "student.accept", entity: "User", entityId: id });
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

  async get(id: string): Promise<AdminStudentRow> {
    await this.mustStudent(id);
    return toRow(await this.prisma.user.findUniqueOrThrow({ where: { id }, select: SELECT }));
  }

  private async mustStudent(id: string) {
    if (!(await this.prisma.user.count({ where: { id, role: "STUDENT" } })))
      throw new NotFoundException("Oʻquvchi topilmadi");
  }
}
