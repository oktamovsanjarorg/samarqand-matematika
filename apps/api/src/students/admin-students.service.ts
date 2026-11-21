import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import type { AdminStudentPatch, AdminStudentRow } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
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
    select: { fullName: true, accessMode: true, acceptedAt: true, group: { select: { name: true } } },
  },
} as const;
type Row = Prisma.UserGetPayload<{ select: typeof SELECT }>;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const toRow = (u: Row): AdminStudentRow => ({
  id: u.id,
  telegramName: [u.firstName, u.lastName].filter(Boolean).join(" "),
  username: u.username,
  fullName: u.student?.fullName ?? null,
  phone: u.phone,
  accessMode: u.student?.accessMode ?? "AUTO",
  acceptedAt: iso(u.student?.acceptedAt),
  groupName: u.student?.group?.name ?? null,
  createdAt: u.createdAt.toISOString(),
  lastSeenAt: iso(u.lastSeenAt),
});

/** Ustoz va yordamchi: o'quvchilar ro'yxati, qabul qilish, kirish rejimi (BR-S03) */
@Injectable()
export class AdminStudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** filter "new": ustoz hali qabul qilmaganlar. q: ism, username yoki telefon bo'yicha qidiruv */
  async list(filter: "new" | "all", q?: string): Promise<AdminStudentRow[]> {
    const text = q?.trim();
    const where: Prisma.UserWhereInput = {
      role: "STUDENT",
      ...(filter === "new" ? { OR: [{ student: null }, { student: { acceptedAt: null } }] } : {}),
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
    return this.get(id);
  }

  async update(actorId: string, id: string, patch: AdminStudentPatch): Promise<AdminStudentRow> {
    await this.mustStudent(id);
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
