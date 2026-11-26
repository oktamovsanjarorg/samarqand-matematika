import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import {
  offlineSections,
  parseOfflineFile,
  type AdminOfflineTestDetail,
  type AdminOfflineTestRow,
  type OfflineFile,
  type OfflineImportInput,
  type OfflinePreview,
  type OfflineSection,
} from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { personName, PERSON_SELECT } from "../common/person";
import { PrismaService } from "../prisma/prisma.service";
import { matchRows, type Candidate } from "./offline-match";
import { scoreOffline } from "./offline-scoring";
import { OfflineTemplate } from "./offline-template";
import {
  asRasch,
  asSections,
  ranked,
  RESULT_ORDER,
  RESULT_SELECT,
  stats,
  TEST_SELECT,
  toRow,
} from "./offline-views";

/** Ustozning oxirgi fan bo'limlari: keyingi importda taklif qilinadi */
const SECTIONS_KEY = "offline.sections";

/** Offline test (T-181, BR-G04): fayl → oldindan ko'rish → saqlash, tahlil, biriktirish, fan bo'limlari */
@Injectable()
export class OfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly template: OfflineTemplate,
  ) {}

  private parse(csv: string): OfflineFile {
    try {
      return parseOfflineFile(csv);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Fayl oʻqilmadi");
    }
  }

  private async graded(csv: string, groupId?: string | null) {
    const file = this.parse(csv);
    const t = await this.template.get();
    const { rasch, rows } = scoreOffline(
      file.rows.map((r) => r.answers),
      t,
    );
    const scored = file.rows.flatMap((r, i) => {
      const sc = rows[i];
      return sc ? [{ ...r, ...sc }] : [];
    });
    return { file, t, rasch, rows: matchRows(scored, await this.candidates(groupId)) };
  }

  async preview(csv: string, groupId?: string | null): Promise<OfflinePreview> {
    const { file, t, rasch, rows } = await this.graded(csv, groupId);
    return {
      format: file.format,
      exam: file.exam,
      questionCount: file.questionCount,
      fileSections: file.sections,
      savedSections: await this.savedSections(file.questionCount),
      scaleMax: t.scaleMax,
      calibrated: rasch.calibrated,
      rows: rows.map((r) => ({
        line: r.line,
        name: r.name,
        phone: r.phone,
        correct: r.correct,
        percent: r.percent,
        score: r.score,
        grade: r.grade,
        match: r.match,
      })),
    };
  }

  async create(actorId: string, input: OfflineImportInput): Promise<AdminOfflineTestDetail> {
    if (input.groupId && !(await this.prisma.group.count({ where: { id: input.groupId } })))
      throw new NotFoundException("Guruh topilmadi");
    const { file, t, rasch, rows } = await this.graded(input.csv, input.groupId);
    const sections = this.checkSections(
      input.sections.length ? input.sections : file.sections,
      file.questionCount,
    );
    const created = await this.prisma.offlineTest.create({
      data: {
        title: input.title,
        date: new Date(`${input.date}T00:00:00Z`),
        groupId: input.groupId ?? null,
        format: file.format,
        questionCount: file.questionCount,
        sections,
        rasch: rasch as unknown as Prisma.InputJsonValue,
        scaleMax: t.scaleMax,
        createdById: actorId,
        results: {
          create: rows.map(({ match, ...r }) => ({ ...r, userId: match?.userId ?? null })),
        },
      },
      select: { id: true },
    });
    if (input.sections.length) await this.saveSections(file.questionCount, input.sections);
    const matched = rows.filter((r) => r.match).length;
    await this.audit.log({
      actorId,
      action: "offline.import",
      entity: "OfflineTest",
      entityId: created.id,
      data: { rows: rows.length, matched },
    });
    return this.get(created.id);
  }

  async list(): Promise<AdminOfflineTestRow[]> {
    const tests = await this.prisma.offlineTest.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { ...TEST_SELECT, results: { select: { userId: true, percent: true, score: true } } },
      take: 200,
    });
    return tests.map((t) => toRow(t, t.results));
  }

  async get(id: string): Promise<AdminOfflineTestDetail> {
    const t = await this.prisma.offlineTest.findUnique({
      where: { id },
      select: {
        ...TEST_SELECT,
        format: true,
        sections: true,
        rasch: true,
        results: { orderBy: [...RESULT_ORDER], select: RESULT_SELECT },
      },
    });
    if (!t) throw new NotFoundException("Test topilmadi");
    const rows = ranked(t.results);
    const sections = asSections(t.sections);
    const grades = (await this.template.get()).grades.map((g) => g.label);
    return {
      ...toRow(t, rows),
      format: t.format === "omr" ? "omr" : "matrix",
      sections,
      rasch: asRasch(t.rasch, t.questionCount),
      stats: stats(rows, sections, grades, t.questionCount),
      rows,
    };
  }

  /** Fan bo'limlarini keyin tahrirlash: ball o'zgarmaydi, faqat bo'limlar bo'yicha hisob */
  async setSections(actorId: string, id: string, sections: OfflineSection[]) {
    const t = await this.prisma.offlineTest.findUnique({ where: { id }, select: { questionCount: true } });
    if (!t) throw new NotFoundException("Test topilmadi");
    const list = this.checkSections(sections, t.questionCount);
    await this.prisma.offlineTest.update({ where: { id }, data: { sections: list } });
    if (list.length) await this.saveSections(t.questionCount, list);
    await this.audit.log({ actorId, action: "offline.sections", entity: "OfflineTest", entityId: id });
    return this.get(id);
  }

  /** Qatorni o'quvchiga qo'lda biriktirish yoki ajratish; bir o'quvchi bitta qatorda */
  async match(actorId: string, id: string, resultId: string, userId: string | null) {
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
    await this.prisma.offlineResult.update({ where: { id: resultId }, data: { userId, notifiedAt: null } });
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

  private checkSections(list: OfflineSection[], questionCount: number): OfflineSection[] {
    const parsed = offlineSections.safeParse(list);
    if (!parsed.success)
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Boʻlimlar notoʻgʻri");
    const big = parsed.data.flatMap((s) => s.questions).find((q) => q > questionCount);
    if (big !== undefined)
      throw new BadRequestException(`Testda ${questionCount} ta savol, ${big}-savol yoʻq`);
    return parsed.data;
  }

  private async savedSections(questionCount: number): Promise<OfflineSection[] | null> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: SECTIONS_KEY } });
    const v = row?.value as { questionCount?: number; sections?: unknown } | undefined;
    if (v?.questionCount !== questionCount) return null;
    const parsed = offlineSections.safeParse(v.sections);
    return parsed.success && parsed.data.length ? parsed.data : null;
  }

  private async saveSections(questionCount: number, sections: OfflineSection[]) {
    const value = { questionCount, sections };
    await this.prisma.appSetting.upsert({
      where: { key: SECTIONS_KEY },
      create: { key: SECTIONS_KEY, value },
      update: { value },
    });
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
