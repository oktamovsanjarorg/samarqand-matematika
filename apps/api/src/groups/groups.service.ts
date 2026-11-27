import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { AdminGroupDetail, AdminGroupRow, GroupInput, GroupPatch } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

const ROW_SELECT = {
  id: true,
  name: true,
  schedule: true,
  isActive: true,
  _count: { select: { students: true } },
} as const;

const toRow = (g: {
  id: string;
  name: string;
  schedule: string | null;
  isActive: boolean;
  _count: { students: number };
}): AdminGroupRow => ({
  id: g.id,
  name: g.name,
  schedule: g.schedule,
  isActive: g.isActive,
  studentCount: g._count.students,
});

/** Ustoz va yordamchi: offline guruhlar va a'zolar (T-054). O'quvchi bitta guruhda */
@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminGroupRow[]> {
    const rows = await this.prisma.group.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: ROW_SELECT,
    });
    return rows.map(toRow);
  }

  async get(id: string): Promise<AdminGroupDetail> {
    const g = await this.prisma.group.findUnique({
      where: { id },
      select: {
        ...ROW_SELECT,
        students: {
          select: {
            userId: true,
            fullName: true,
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
    });
    if (!g) throw new NotFoundException("Guruh topilmadi");
    const students = g.students
      .map((s) => ({
        id: s.userId,
        name: s.fullName ?? ([s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || "Oʻquvchi"),
        phone: s.user.phone,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { ...toRow(g), students };
  }

  async create(actorId: string, input: GroupInput) {
    const g = await this.prisma.group.create({
      data: { name: input.name, schedule: input.schedule ?? null },
      select: { id: true },
    });
    await this.audit.log({
      actorId,
      action: "group.create",
      entity: "Group",
      entityId: g.id,
      data: { name: input.name },
    });
    return g;
  }

  async update(actorId: string, id: string, patch: GroupPatch) {
    const { count } = await this.prisma.group.updateMany({ where: { id }, data: patch });
    if (!count) throw new NotFoundException("Guruh topilmadi");
    await this.audit.log({ actorId, action: "group.update", entity: "Group", entityId: id, data: patch });
    return this.get(id);
  }

  /** O'quvchilarni guruhga qo'shish: boshqa guruhda bo'lsa shu guruhga o'tadi */
  async add(actorId: string, id: string, userIds: string[]) {
    if (!(await this.prisma.group.count({ where: { id } }))) throw new NotFoundException("Guruh topilmadi");
    const found = await this.prisma.user.count({ where: { id: { in: userIds }, role: "STUDENT" } });
    if (found !== new Set(userIds).size) throw new BadRequestException("Baʼzi oʻquvchilar topilmadi");
    await this.prisma.$transaction(
      userIds.map((userId) =>
        this.prisma.studentProfile.upsert({
          where: { userId },
          update: { groupId: id },
          create: { userId, groupId: id },
        }),
      ),
    );
    await this.audit.log({ actorId, action: "group.add", entity: "Group", entityId: id, data: { userIds } });
    return this.get(id);
  }

  async remove(actorId: string, id: string, userId: string) {
    const { count } = await this.prisma.studentProfile.updateMany({
      where: { userId, groupId: id },
      data: { groupId: null },
    });
    if (!count) throw new NotFoundException("Oʻquvchi bu guruhda emas");
    await this.audit.log({
      actorId,
      action: "group.remove",
      entity: "Group",
      entityId: id,
      data: { userId },
    });
    return this.get(id);
  }

  /**
   * Guruhni o'chirish (T-188): o'quvchilar guruhsiz (online) qoladi, offline testlar guruh nomisiz
   * saqlanadi, davomat tarixi guruh bilan birga o'chadi. Audit'da nom va sonlar qoladi.
   */
  async destroy(actorId: string, id: string) {
    const g = await this.prisma.group.findUnique({
      where: { id },
      select: { name: true, _count: { select: { students: true, attendance: true } } },
    });
    if (!g) throw new NotFoundException("Guruh topilmadi");
    await this.prisma.group.delete({ where: { id } });
    await this.audit.log({
      actorId,
      action: "group.delete",
      entity: "Group",
      entityId: id,
      data: { name: g.name, students: g._count.students, attendance: g._count.attendance },
    });
  }
}
