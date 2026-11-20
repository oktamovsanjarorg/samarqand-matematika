import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  parseOfflineCsv,
  type AdminOfflineTestDetail,
  type AdminOfflineTestRow,
  type OfflineImportInput,
  type OfflinePreview,
} from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { personName, PERSON_SELECT } from "../common/person";
import { PrismaService } from "../prisma/prisma.service";
import { matchRows, type Candidate } from "./offline-match";

const ROW_SELECT = {
  id: true,
  title: true,
  date: true,
  sections: true,
  group: { select: { name: true } },
  results: { select: { userId: true } },
} as const;

type TestRow = {
  id: string;
  title: string;
  date: Date;
  sections: string[];
  group: { name: string } | null;
  results: { userId: string | null }[];
};
const toRow = (t: TestRow): AdminOfflineTestRow => ({
  id: t.id,
  title: t.title,
  date: t.date.toISOString().slice(0, 10),
  groupName: t.group?.name ?? null,
  sections: t.sections,
  count: t.results.length,
  matched: t.results.filter((r) => r.userId).length,
});

/** Tashqi test importi (T-056): CSV → oldindan ko'rish → saqlash, moslanmaganlarni qo'lda biriktirish */
@Injectable()
export class OfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async preview(csv: string, groupId?: string | null): Promise<OfflinePreview> {
    const parsed = parseOfflineCsv(csv);
    if (!parsed.rows.length) return { sections: parsed.sections, rows: [], errors: parsed.errors };
    return {
      sections: parsed.sections,
      rows: matchRows(parsed.rows, await this.candidates(groupId)),
      errors: parsed.errors,
    };
  }

  async create(actorId: string, input: OfflineImportInput): Promise<AdminOfflineTestDetail> {
    if (input.groupId && !(await this.prisma.group.count({ where: { id: input.groupId } })))
      throw new NotFoundException("Guruh topilmadi");
    const p = await this.preview(input.csv, input.groupId);
    if (p.errors.length) {
      const first = p.errors.slice(0, 3).map((e) => (e.line ? `${e.line}-qator: ${e.message}` : e.message));
      throw new BadRequestException(first.join("; "));
    }
    const t = await this.prisma.offlineTest.create({
      data: {
        title: input.title,
        date: new Date(`${input.date}T00:00:00Z`),
        groupId: input.groupId ?? null,
        sections: p.sections,
        createdById: actorId,
        results: {
          create: p.rows.map((r) => ({
            line: r.line,
            name: r.name,
            phone: r.phone,
            scores: r.scores,
            total: r.total,
            userId: r.match?.userId ?? null,
          })),
        },
      },
      select: { id: true },
    });
    const matched = p.rows.filter((r) => r.match).length;
    await this.audit.log({
      actorId,
      action: "offline.import",
      entity: "OfflineTest",
      entityId: t.id,
      data: { rows: p.rows.length, matched },
    });
    return this.get(t.id);
  }

  async list(): Promise<AdminOfflineTestRow[]> {
    const rows = await this.prisma.offlineTest.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: ROW_SELECT,
      take: 200,
    });
    return rows.map(toRow);
  }

  async get(id: string): Promise<AdminOfflineTestDetail> {
    const t = await this.prisma.offlineTest.findUnique({
      where: { id },
      select: {
        ...ROW_SELECT,
        results: {
          orderBy: [{ total: "desc" }, { line: "asc" }],
          select: {
            id: true,
            line: true,
            name: true,
            phone: true,
            scores: true,
            total: true,
            userId: true,
            user: { select: PERSON_SELECT },
          },
        },
      },
    });
    if (!t) throw new NotFoundException("Test topilmadi");
    const rows = t.results.map(({ user, ...r }) => ({ ...r, userName: user ? personName(user) : null }));
    return { ...toRow(t), rows };
  }

  /** Qatorni o'quvchiga qo'lda biriktirish yoki ajratish; bir o'quvchi bitta qatorda */
  async match(
    actorId: string,
    id: string,
    resultId: string,
    userId: string | null,
  ): Promise<AdminOfflineTestDetail> {
    const r = await this.prisma.offlineResult.findFirst({
      where: { id: resultId, offlineTestId: id },
      select: { id: true },
    });
    if (!r) throw new NotFoundException("Qator topilmadi");
    if (userId) {
      if (!(await this.prisma.user.count({ where: { id: userId, role: "STUDENT" } })))
        throw new BadRequestException("Oʻquvchi topilmadi");
      const taken = await this.prisma.offlineResult.count({
        where: { offlineTestId: id, userId, NOT: { id: resultId } },
      });
      if (taken) throw new BadRequestException("Bu oʻquvchi boshqa qatorga biriktirilgan");
    }
    await this.prisma.offlineResult.update({ where: { id: resultId }, data: { userId } });
    await this.audit.log({
      actorId,
      action: "offline.match",
      entity: "OfflineTest",
      entityId: id,
      data: { resultId, userId },
    });
    return this.get(id);
  }

  async remove(actorId: string, id: string) {
    const { count } = await this.prisma.offlineTest.deleteMany({ where: { id } });
    if (!count) throw new NotFoundException("Test topilmadi");
    await this.audit.log({ actorId, action: "offline.delete", entity: "OfflineTest", entityId: id });
  }

  private async candidates(groupId?: string | null): Promise<Candidate[]> {
    const users = await this.prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        phone: true,
        ...PERSON_SELECT,
        student: { select: { fullName: true, groupId: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      name: personName(u),
      phone: u.phone,
      inGroup: !!groupId && u.student?.groupId === groupId,
    }));
  }
}
