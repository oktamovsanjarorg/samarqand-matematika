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
  weeklyStatus,
  type RoleName,
  type StudentWeeklyRow,
  type WeeklyAttemptView,
} from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { AiReviewService } from "./ai-reviews";
import { PrismaService } from "../prisma/prisma.service";
import { checkAnswer } from "../questions/check";
import { toDetail } from "../questions/codec";
import {
  scoreOf,
  WEEKLY_ATTEMPT_INCLUDE,
  weeklyView,
  withPhotoRule,
  type WeeklyAttemptRow,
} from "./weekly-views";

const asJson = (v: unknown) => v as object;

/** O'quvchi: haftalik test (BR-W01–W03, W08). Vaqt faqat server bo'yicha */
@Injectable()
export class WeeklyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly reviews: AiReviewService,
  ) {}

  async list(userId: string): Promise<StudentWeeklyRow[]> {
    const now = new Date();
    const rows = await this.prisma.weeklyTest.findMany({
      where: { isPublished: true },
      orderBy: { opensAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        opensAt: true,
        closesAt: true,
        _count: { select: { questions: true } },
        attempts: { where: { userId }, select: { submittedAt: true, correct: true, score: true } },
      },
    });
    return rows.map((t) => {
      const status = weeklyStatus(now, t.opensAt, t.closesAt);
      const a = t.attempts[0];
      return {
        id: t.id,
        title: t.title,
        opensAt: t.opensAt.toISOString(),
        closesAt: t.closesAt.toISOString(),
        status,
        questionCount: t._count.questions,
        my: {
          started: !!a,
          submitted: !!a?.submittedAt,
          score: status === "CLOSED" ? (a ? scoreOf(a) : 0) : null,
        },
      };
    });
  }

  /** Boshlash yoki davom ettirish: faqat oyna ochiq paytda, to'liq kirish bilan; urinish bitta (BR-W02) */
  async start(userId: string, role: RoleName, testId: string): Promise<WeeklyAttemptView> {
    const t = await this.prisma.weeklyTest.findFirst({
      where: { id: testId, isPublished: true },
      select: {
        opensAt: true,
        closesAt: true,
        questions: { orderBy: { order: "asc" }, select: { questionId: true } },
      },
    });
    if (!t) throw new NotFoundException("Test topilmadi");
    const existing = await this.prisma.weeklyAttempt.findUnique({
      where: { weeklyTestId_userId: { weeklyTestId: testId, userId } },
      include: WEEKLY_ATTEMPT_INCLUDE,
    });
    if (existing) return weeklyView(existing as WeeklyAttemptRow, new Date());
    const status = weeklyStatus(new Date(), t.opensAt, t.closesAt);
    if (status !== "OPEN")
      throw new ConflictException(status === "UPCOMING" ? "Test hali ochilmagan" : "Test yopilgan");
    if (!(await this.access.hasFullAccess(userId, role)))
      throw new ForbiddenException({
        code: ERROR_CODES.LOCKED,
        message: "Haftalik test obuna bilan ochiladi",
      });
    const created = await this.prisma.weeklyAttempt.upsert({
      where: { weeklyTestId_userId: { weeklyTestId: testId, userId } },
      update: {},
      create: {
        weeklyTestId: testId,
        userId,
        answers: { create: t.questions.map((q, order) => ({ questionId: q.questionId, order })) },
      },
      include: WEEKLY_ATTEMPT_INCLUDE,
    });
    return weeklyView(created as WeeklyAttemptRow, new Date());
  }

  async get(userId: string, id: string): Promise<WeeklyAttemptView> {
    return weeklyView(await this.own(userId, id), new Date());
  }

  async save(userId: string, id: string, questionId: string, response: unknown): Promise<void> {
    const a = await this.ownOpen(userId, id);
    const item = a.answers.find((x) => x.question.id === questionId);
    if (!item) throw new NotFoundException("Savol bu testda yoʻq");
    if (!responseSchemas[item.question.type].safeParse(response).success)
      throw new BadRequestException("Javob shakli savol turiga mos emas");
    await this.prisma.weeklyAnswer.update({
      where: { attemptId_questionId: { attemptId: id, questionId } },
      data: { response: asJson(response) },
    });
  }

  /** Topshirish oyna ichida bo'lishi shart (BR-W03); natija oyna yopilgach ochiladi (BR-W08) */
  async submit(userId: string, id: string): Promise<WeeklyAttemptView> {
    const a = await this.ownOpen(userId, id);
    // Natijada tekshiruvning o'zi saqlanadi; ballga rasmsiz to'g'ri javob kirmaydi (BR-W04)
    const graded = a.answers.map((x) => ({
      questionId: x.question.id,
      result: checkAnswer(toDetail(x.question), x.response),
      photos: x.photos.length,
    }));
    const correct = graded.filter((g) => withPhotoRule(g.result, g.photos) === "CORRECT").length;
    const done = await this.prisma.$transaction(async (tx) => {
      const closed = await tx.weeklyAttempt.updateMany({
        where: { id, submittedAt: null },
        data: { submittedAt: new Date(), correct },
      });
      if (closed.count === 0) throw new ConflictException("Test allaqachon topshirilgan");
      for (const g of graded)
        await tx.weeklyAnswer.update({
          where: { attemptId_questionId: { attemptId: id, questionId: g.questionId } },
          data: { result: g.result },
        });
      return tx.weeklyAttempt.findUniqueOrThrow({ where: { id }, include: WEEKLY_ATTEMPT_INCLUDE });
    });
    // Rasmli savollar AI tekshiruviga (natija o'quvchiga ko'rsatilmaydi, ustoz navbati uchun)
    await this.reviews.enqueue(
      id,
      graded.filter((g) => g.photos > 0).map((g) => g.questionId),
    );
    return weeklyView(done as WeeklyAttemptRow, new Date());
  }

  async own(userId: string, id: string): Promise<WeeklyAttemptRow> {
    const a = await this.prisma.weeklyAttempt.findFirst({
      where: { id, userId },
      include: WEEKLY_ATTEMPT_INCLUDE,
    });
    if (!a) throw new NotFoundException("Test topilmadi");
    return a as WeeklyAttemptRow;
  }

  /** O'quvchining ochiq (topshirilmagan, oyna ichida) urinishi; aks holda 409 */
  async ownOpen(userId: string, id: string): Promise<WeeklyAttemptRow> {
    const a = await this.own(userId, id);
    if (a.submittedAt) throw new ConflictException("Test allaqachon topshirilgan");
    if (new Date() >= a.weeklyTest.closesAt)
      throw new ConflictException("Test yopilgan: javob qabul qilinmaydi");
    return a;
  }
}
