import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ERROR_CODES,
  responseSchemas,
  type AttemptResult,
  type AttemptView,
  type RoleName,
} from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { PrismaService } from "../prisma/prisma.service";
import { checkAnswer } from "../questions/check";
import { toDetail } from "../questions/codec";
import { ATTEMPT_INCLUDE, openView, resultView, type AttemptRow } from "./attempt-views";

const published = { isPublished: true } as const;
const asJson = (v: unknown) => v as object;

/** Mavzu testlari (T-023): mashq rejimi, vaqt server bo'yicha, javoblar topshirilgandan keyin ochiladi */
@Injectable()
export class TopicTestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Ochiq urinish bo'lsa davom ettiradi, bo'lmasa yangisini boshlaydi */
  async start(userId: string, role: RoleName, topicId: string): Promise<AttemptView> {
    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, course: published },
      select: { questions: { where: published, orderBy: { order: "asc" }, select: { id: true } } },
    });
    if (!topic || topic.questions.length === 0) throw new NotFoundException("Bu mavzuda test yoʻq");
    if (!(await this.access.hasFullAccess(userId, role)))
      throw new ForbiddenException({ code: ERROR_CODES.LOCKED, message: "Mavzu testi obuna bilan ochiladi" });

    const open = await this.prisma.topicAttempt.findFirst({
      where: { userId, topicId, submittedAt: null },
      orderBy: { startedAt: "desc" },
      include: ATTEMPT_INCLUDE,
    });
    if (open) return openView(open as AttemptRow);
    const created = await this.prisma.topicAttempt.create({
      data: {
        userId,
        topicId,
        answers: { create: topic.questions.map((q, order) => ({ questionId: q.id, order })) },
      },
      include: ATTEMPT_INCLUDE,
    });
    return openView(created as AttemptRow);
  }

  async get(userId: string, id: string): Promise<AttemptView | AttemptResult> {
    const a = await this.own(userId, id);
    return a.submittedAt ? resultView(a) : openView(a);
  }

  /** Bitta javobni saqlaydi. Shakli savol turiga mos kelmasa 400 */
  async save(userId: string, id: string, questionId: string, response: unknown): Promise<void> {
    const a = await this.ownOpen(userId, id);
    const item = a.answers.find((x) => x.question.id === questionId);
    if (!item) throw new NotFoundException("Savol bu testda yoʻq");
    if (!responseSchemas[item.question.type].safeParse(response).success)
      throw new BadRequestException("Javob shakli savol turiga mos emas");
    await this.prisma.topicAnswer.update({
      where: { attemptId_questionId: { attemptId: id, questionId } },
      data: { response: asJson(response) },
    });
  }

  /** Topshirish: har savol avtomatik tekshiriladi, natija va izohlar qaytadi */
  async submit(userId: string, id: string): Promise<AttemptResult> {
    const a = await this.ownOpen(userId, id);
    const graded = a.answers.map((x) => ({
      questionId: x.question.id,
      result: checkAnswer(toDetail(x.question), x.response),
    }));
    const correct = graded.filter((g) => g.result === "CORRECT").length;
    const submittedAt = new Date();
    const done = await this.prisma.$transaction(async (tx) => {
      // Faqat hali ochiq urinish yopiladi: parallel ikki topshirishdan bittasi o'tadi
      const closed = await tx.topicAttempt.updateMany({
        where: { id, submittedAt: null },
        data: { submittedAt, correct },
      });
      if (closed.count === 0) throw new ConflictException("Test allaqachon topshirilgan");
      for (const g of graded) {
        await tx.topicAnswer.update({
          where: { attemptId_questionId: { attemptId: id, questionId: g.questionId } },
          data: { result: g.result },
        });
      }
      return tx.topicAttempt.findUniqueOrThrow({ where: { id }, include: ATTEMPT_INCLUDE });
    });
    return resultView(done as AttemptRow);
  }

  private async own(userId: string, id: string): Promise<AttemptRow> {
    const a = await this.prisma.topicAttempt.findFirst({ where: { id, userId }, include: ATTEMPT_INCLUDE });
    // Boshqa o'quvchining urinishi ham "topilmadi": mavjudligi oshkor qilinmaydi
    if (!a) throw new NotFoundException("Test topilmadi");
    return a as AttemptRow;
  }

  private async ownOpen(userId: string, id: string): Promise<AttemptRow> {
    const a = await this.own(userId, id);
    if (a.submittedAt) throw new ConflictException("Test allaqachon topshirilgan");
    return a;
  }
}
