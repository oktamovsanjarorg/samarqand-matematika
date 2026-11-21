import type { Prisma } from "@samarqand/db";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { parseExpression, parseNumber } from "@samarqand/math";
import {
  ERROR_CODES,
  QUESTION_SEARCH_LIMIT,
  type AdminQuestionDetail,
  type AdminQuestionHit,
  type AdminQuestionRow,
  type QuestionInput,
} from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { TrashService } from "../trash/trash.service";
import { toDetail, toStorage } from "./codec";

const ROW = {
  id: true,
  type: true,
  text: true,
  difficulty: true,
  skills: true,
  order: true,
  isPublished: true,
  answer: true,
} as const;

/** Ro'yxat qatori: javobning o'zi kliyentga yuborilmaydi, faqat "qo'lda tekshiriladi" belgisi (T-085) */
function toRow({ answer, ...q }: Prisma.QuestionGetPayload<{ select: typeof ROW }>): AdminQuestionRow {
  const manual =
    q.type === "WRITTEN" ||
    (q.type === "EXPRESSION" &&
      typeof answer === "object" &&
      answer !== null &&
      "manual" in answer &&
      answer.manual === true);
  return { ...q, manual };
}

/** Son javobi, chegarasi va ifoda (T-074) o'qiladigan bo'lishi shart: aks holda hech kim to'g'ri javob bera olmaydi */
function assertCheckable(q: QuestionInput) {
  if (q.type === "EXPRESSION" && !q.answer.manual && !parseExpression(q.answer.value))
    throw new BadRequestException(
      "answer.value: ifoda sifatida oʻqilmadi. Shakl muhim boʻlsa «Ustoz tekshiradi» ni belgilang",
    );
  if (q.type !== "NUMERIC") return;
  if (!parseNumber(q.answer.value)) throw new BadRequestException("answer.value: son sifatida oʻqilmadi");
  if (q.answer.tolerance !== undefined && !parseNumber(q.answer.tolerance))
    throw new BadRequestException("answer.tolerance: son sifatida oʻqilmadi");
}

/** Admin: savollar banki (T-022). Ustoz ham, yordamchi ham boshqaradi */
@Injectable()
export class AdminQuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly trash: TrashService,
  ) {}

  async list(topicId: string): Promise<AdminQuestionRow[]> {
    await this.mustTopic(topicId);
    const rows = await this.prisma.question.findMany({
      where: { topicId },
      orderBy: { order: "asc" },
      select: ROW,
    });
    return rows.map(toRow);
  }

  /** Matnda uchragan yoki teg aynan mos savollar, kontent tartibida (T-096) */
  async search(q: string): Promise<AdminQuestionHit[]> {
    const rows = await this.prisma.question.findMany({
      where: { OR: [{ text: { contains: q, mode: "insensitive" } }, { skills: { has: q.toLowerCase() } }] },
      orderBy: [{ topic: { course: { order: "asc" } } }, { topic: { order: "asc" } }, { order: "asc" }],
      take: QUESTION_SEARCH_LIMIT,
      select: { ...ROW, topic: { select: { id: true, title: true, course: { select: { title: true } } } } },
    });
    return rows.map(({ topic, ...r }) => ({
      ...toRow(r),
      topicId: topic.id,
      topicTitle: `${topic.course.title} · ${topic.title}`,
    }));
  }

  async get(id: string): Promise<AdminQuestionDetail> {
    const row = await this.prisma.question.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Savol topilmadi");
    return toDetail(row);
  }

  async create(actorId: string, topicId: string, input: QuestionInput): Promise<AdminQuestionDetail> {
    await this.mustTopic(topicId);
    assertCheckable(input);
    const order = await this.prisma.question.count({ where: { topicId } });
    const row = await this.prisma.question.create({ data: { ...toStorage(input), topicId, order } });
    await this.audit.log({ actorId, action: "question.create", entity: "Question", entityId: row.id });
    return toDetail(row);
  }

  /** To'liq almashtirish: tur o'zgarsa eski variantlar va javob ham almashadi */
  async replace(actorId: string, id: string, input: QuestionInput): Promise<AdminQuestionDetail> {
    await this.get(id);
    assertCheckable(input);
    const row = await this.prisma.question.update({ where: { id }, data: toStorage(input) });
    // Javob auditga yozilmaydi: audit jurnalini ko'rgan kishi javobni bilib qolmasin
    await this.audit.log({
      actorId,
      action: "question.update",
      entity: "Question",
      entityId: id,
      data: { type: input.type },
    });
    return toDetail(row);
  }

  async remove(actorId: string, id: string): Promise<void> {
    const row = await this.prisma.question.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Savol topilmadi");
    // Testda ishlatilgan savol o'chirilmaydi: o'quvchilar natijasi buzilmasin (T-095: haftalik va mock ham)
    const [topic, weekly, mock] = await Promise.all([
      this.prisma.topicAnswer.count({ where: { questionId: id } }),
      this.prisma.weeklyQuestion.count({ where: { questionId: id } }),
      this.prisma.mockQuestion.count({ where: { questionId: id } }),
    ]);
    if (topic + weekly + mock > 0)
      throw new ConflictException({
        code: ERROR_CODES.NOT_EMPTY,
        message:
          weekly + mock > 0
            ? "Savol haftalik yoki mock testda bor: avval testdan olib tashlang"
            : "Savol testlarda ishlatilgan: oʻchirish oʻrniga nashrdan oling",
      });
    await this.prisma.$transaction([
      this.trash.record(actorId, "Question", row),
      this.prisma.question.delete({ where: { id } }),
    ]);
    await this.audit.log({ actorId, action: "question.delete", entity: "Question", entityId: id });
  }

  private async mustTopic(id: string) {
    if (!(await this.prisma.topic.count({ where: { id } }))) throw new NotFoundException("Mavzu topilmadi");
  }
}
