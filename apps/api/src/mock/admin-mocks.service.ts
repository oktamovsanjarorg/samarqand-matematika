import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import {
  examQuestionCount,
  examTemplateInput,
  weeklyStatus,
  type AdminMockDetail,
  type AdminMockRow,
  type ExamTemplateInput,
  type MockTestInput,
} from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { toTemplate } from "./exam-templates.service";

const ROW_SELECT = {
  id: true,
  title: true,
  opensAt: true,
  closesAt: true,
  isPublished: true,
  template: true,
  _count: { select: { questions: true, attempts: { where: { submittedAt: { not: null } } } } },
} as const;
type Row = Prisma.MockTestGetPayload<{ select: typeof ROW_SELECT }>;

/** Saqlangan nusxa sxema bilan o'qiladi (yozishda ham shu sxemadan o'tgan) */
export const snapshotOf = (json: Prisma.JsonValue): ExamTemplateInput => examTemplateInput.parse(json);

const toRow = (t: Row, now: Date): AdminMockRow => {
  const template = snapshotOf(t.template);
  return {
    id: t.id,
    title: t.title,
    templateName: template.name,
    opensAt: t.opensAt.toISOString(),
    closesAt: t.closesAt.toISOString(),
    isPublished: t.isPublished,
    status: weeklyStatus(now, t.opensAt, t.closesAt),
    questionCount: t._count.questions,
    submitted: t._count.attempts,
  };
};

const questionRows = (sections: string[][]) =>
  sections
    .flatMap((ids, section) => ids.map((questionId) => ({ questionId, section })))
    .map((q, order) => ({ ...q, order }));

/** Ustoz: mocklar. Shablon nusxasi yaratishda olinadi; boshlangan mockning savollari o'zgarmaydi */
@Injectable()
export class AdminMocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminMockRow[]> {
    const rows = await this.prisma.mockTest.findMany({
      orderBy: { opensAt: "desc" },
      take: 100,
      select: ROW_SELECT,
    });
    const now = new Date();
    return rows.map((r) => toRow(r, now));
  }

  async get(id: string): Promise<AdminMockDetail> {
    const t = await this.prisma.mockTest.findUnique({
      where: { id },
      select: {
        ...ROW_SELECT,
        templateId: true,
        questions: {
          orderBy: { order: "asc" },
          select: {
            section: true,
            question: { select: { id: true, type: true, text: true, topic: { select: { title: true } } } },
          },
        },
      },
    });
    if (!t) throw new NotFoundException("Mock topilmadi");
    const template = snapshotOf(t.template);
    const sections = template.sections.map((_, i) =>
      t.questions
        .filter((q) => q.section === i)
        .map(({ question: q }) => ({ id: q.id, type: q.type, text: q.text, topicTitle: q.topic.title })),
    );
    return { ...toRow(t, new Date()), templateId: t.templateId, template, sections };
  }

  async create(actorId: string, input: MockTestInput) {
    const row = await this.prisma.examTemplate.findFirst({ where: { id: input.templateId, isActive: true } });
    const template = row && toTemplate(row);
    if (!template) throw new BadRequestException("Shablon topilmadi");
    const { id: _id, isActive: _a, ...snapshot } = template;
    await this.mustFit(snapshot, input.sections);
    const t = await this.prisma.mockTest.create({
      data: {
        ...this.fields(input),
        templateId: template.id,
        template: snapshot as unknown as Prisma.InputJsonValue,
        questions: { create: questionRows(input.sections) },
      },
      select: { id: true },
    });
    await this.audit.log({
      actorId,
      action: "mock.create",
      entity: "MockTest",
      entityId: t.id,
      data: { title: input.title },
    });
    return t;
  }

  async update(actorId: string, id: string, input: MockTestInput) {
    const current = await this.get(id);
    if (current.templateId !== input.templateId)
      throw new BadRequestException("Shablonni oʻzgartirib boʻlmaydi: yangi mock yarating");
    const same =
      JSON.stringify(current.sections.map((s) => s.map((q) => q.id))) === JSON.stringify(input.sections);
    if (!same && (await this.prisma.mockAttempt.count({ where: { mockTestId: id } })))
      throw new ConflictException("Mock boshlangan: savollarni oʻzgartirib boʻlmaydi");
    await this.mustFit(current.template, input.sections);
    await this.prisma.$transaction(async (tx) => {
      await tx.mockTest.update({ where: { id }, data: this.fields(input) });
      if (same) return;
      await tx.mockQuestion.deleteMany({ where: { mockTestId: id } });
      await tx.mockQuestion.createMany({
        data: questionRows(input.sections).map((q) => ({ ...q, mockTestId: id })),
      });
    });
    await this.audit.log({
      actorId,
      action: "mock.update",
      entity: "MockTest",
      entityId: id,
      data: { title: input.title },
    });
    return { ok: true };
  }

  async remove(actorId: string, id: string) {
    if (await this.prisma.mockAttempt.count({ where: { mockTestId: id } }))
      throw new ConflictException("Mockni ishlaganlar bor: oʻchirib boʻlmaydi, nashrdan oling");
    const { count } = await this.prisma.mockTest.deleteMany({ where: { id } });
    if (!count) throw new NotFoundException("Mock topilmadi");
    await this.audit.log({ actorId, action: "mock.delete", entity: "MockTest", entityId: id });
  }

  private fields(i: MockTestInput) {
    return {
      title: i.title,
      opensAt: new Date(i.opensAt),
      closesAt: new Date(i.closesAt),
      isPublished: i.isPublished ?? false,
    };
  }

  /** Har bo'limda shablondagi son va turlar (BR-M01); savollar bankda bo'lishi shart */
  private async mustFit(template: ExamTemplateInput, sections: string[][]) {
    if (sections.length !== template.sections.length)
      throw new BadRequestException("Boʻlimlar soni shablonga mos emas");
    const ids = sections.flat();
    const found = await this.prisma.question.findMany({
      where: { id: { in: ids } },
      select: { id: true, type: true },
    });
    if (found.length !== ids.length) throw new BadRequestException("Baʼzi savollar topilmadi");
    const typeOf = new Map(found.map((q) => [q.id, q.type]));
    template.sections.forEach((s, i) => {
      const got = sections[i] ?? [];
      if (got.length !== s.count)
        throw new BadRequestException(
          `${i + 1}-boʻlim: ${s.count} ta savol kerak, ${got.length} ta tanlangan`,
        );
      if (got.some((q) => !s.types.includes(typeOf.get(q) ?? "WRITTEN")))
        throw new BadRequestException(`${i + 1}-boʻlim: savol turi shablonga mos emas`);
    });
    if (ids.length !== examQuestionCount(template.sections))
      throw new BadRequestException("Savollar soni shablonga mos emas");
  }
}
