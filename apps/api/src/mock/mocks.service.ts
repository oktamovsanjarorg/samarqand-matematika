import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  approxScaled,
  ERROR_CODES,
  examMaxRaw,
  examQuestionCount,
  gradeOf,
  responseSchemas,
  weeklyStatus,
  type MockAttemptView,
  type RoleName,
  type StudentMockRow,
} from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { PrismaService } from "../prisma/prisma.service";
import { checkAnswer } from "../questions/check";
import { toDetail } from "../questions/codec";
import { snapshotOf } from "./admin-mocks.service";
import { MOCK_ATTEMPT_INCLUDE, mockView, rawOf, type MockAttemptRow } from "./mock-views";

const MINUTE = 60_000;

/** O'quvchi: mock (T-051b). Vaqt faqat server bo'yicha; to'g'ri javoblar oyna yopilguncha yuborilmaydi */
@Injectable()
export class MocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(userId: string, now = new Date()): Promise<StudentMockRow[]> {
    await this.finalizeExpired({ userId }, now);
    const rows = await this.prisma.mockTest.findMany({
      where: { isPublished: true },
      orderBy: { opensAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        opensAt: true,
        closesAt: true,
        template: true,
        attempts: { where: { userId }, select: { submittedAt: true, raw: true, scaled: true } },
      },
    });
    return rows.map((m) => {
      const t = snapshotOf(m.template);
      const status = weeklyStatus(now, m.opensAt, m.closesAt);
      const a = m.attempts[0];
      const scaled =
        status === "CLOSED"
          ? (a?.scaled ?? approxScaled(a?.raw ?? 0, examMaxRaw(t.sections), t.scaleMax))
          : null;
      return {
        id: m.id,
        title: m.title,
        opensAt: m.opensAt.toISOString(),
        closesAt: m.closesAt.toISOString(),
        status,
        durationMin: t.durationMin,
        questionCount: examQuestionCount(t.sections),
        my: {
          started: !!a,
          submitted: !!a?.submittedAt,
          scaled,
          grade: scaled === null ? null : gradeOf(scaled, t.grades),
        },
      };
    });
  }

  /** Boshlash yoki davom ettirish: oyna ochiq, to'liq kirish; muddat = shablon vaqti, oyna yopilishidan oshmaydi */
  async start(userId: string, role: RoleName, mockId: string): Promise<MockAttemptView> {
    const now = new Date();
    const m = await this.prisma.mockTest.findFirst({
      where: { id: mockId, isPublished: true },
      select: { opensAt: true, closesAt: true, template: true, questions: { orderBy: { order: "asc" } } },
    });
    if (!m) throw new NotFoundException("Mock topilmadi");
    const existing = await this.prisma.mockAttempt.findUnique({
      where: { mockTestId_userId: { mockTestId: mockId, userId } },
    });
    if (existing) return this.get(userId, existing.id);
    const status = weeklyStatus(now, m.opensAt, m.closesAt);
    if (status !== "OPEN")
      throw new ConflictException(status === "UPCOMING" ? "Mock hali ochilmagan" : "Mock yopilgan");
    if (!(await this.access.hasFullAccess(userId, role)))
      throw new ForbiddenException({ code: ERROR_CODES.LOCKED, message: "Mock obuna bilan ochiladi" });
    const end = now.getTime() + snapshotOf(m.template).durationMin * MINUTE;
    const a = await this.prisma.mockAttempt.upsert({
      where: { mockTestId_userId: { mockTestId: mockId, userId } },
      update: {},
      create: {
        mockTestId: mockId,
        userId,
        deadline: new Date(Math.min(end, m.closesAt.getTime())),
        answers: {
          create: m.questions.map((q) => ({ questionId: q.questionId, section: q.section, order: q.order })),
        },
      },
      include: MOCK_ATTEMPT_INCLUDE,
    });
    return mockView(a, now);
  }

  async get(userId: string, id: string): Promise<MockAttemptView> {
    return mockView(await this.own(userId, id), new Date());
  }

  /**
   * T-193: ilovadan chiqish (o'quvchi qaytganda). Faqat o'z urinishi va topshirilmagan bo'lsa yoziladi;
   * boshqa holatda jim o'tkaziladi (signal, xato emas). O'quvchiga hech qayerda ko'rsatilmaydi
   */
  async away(userId: string, id: string, ms: number): Promise<void> {
    await this.prisma.mockAttempt.updateMany({
      where: { id, userId, submittedAt: null },
      data: { awayCount: { increment: 1 }, awayMs: { increment: ms } },
    });
  }

  async save(userId: string, id: string, questionId: string, response: unknown): Promise<void> {
    const a = await this.ownOpen(userId, id);
    const item = a.answers.find((x) => x.questionId === questionId);
    if (!item) throw new NotFoundException("Savol bu mockda yoʻq");
    if (!responseSchemas[item.question.type].safeParse(response).success)
      throw new BadRequestException("Javob shakli savol turiga mos emas");
    await this.prisma.mockAnswer.update({
      where: { attemptId_questionId: { attemptId: id, questionId } },
      data: { response: response as object },
    });
  }

  async submit(userId: string, id: string): Promise<MockAttemptView> {
    const a = await this.ownOpen(userId, id);
    await this.finalize(a, new Date());
    return this.get(userId, id);
  }

  /** Vaqti tugagan, topshirilmagan urinishlar saqlangan javoblar bilan topshiriladi (vaqti = muddat) */
  async finalizeExpired(where: { userId?: string; mockTestId?: string }, now = new Date()) {
    const due = await this.prisma.mockAttempt.findMany({
      where: { ...where, submittedAt: null, deadline: { lte: now } },
      include: MOCK_ATTEMPT_INCLUDE,
    });
    for (const a of due) await this.finalize(a, a.deadline);
  }

  private async finalize(a: MockAttemptRow, at: Date) {
    const t = snapshotOf(a.mockTest.template);
    const graded = a.answers.map((x) => ({
      questionId: x.questionId,
      section: x.section,
      result: checkAnswer(toDetail(x.question), x.response),
    }));
    await this.prisma.$transaction(async (tx) => {
      const closed = await tx.mockAttempt.updateMany({
        where: { id: a.id, submittedAt: null },
        data: { submittedAt: at, raw: rawOf(t, graded) },
      });
      if (!closed.count) return;
      for (const g of graded)
        await tx.mockAnswer.update({
          where: { attemptId_questionId: { attemptId: a.id, questionId: g.questionId } },
          data: { result: g.result },
        });
    });
  }

  private async own(userId: string, id: string): Promise<MockAttemptRow> {
    const find = () =>
      this.prisma.mockAttempt.findFirst({ where: { id, userId }, include: MOCK_ATTEMPT_INCLUDE });
    const a = await find();
    if (!a) throw new NotFoundException("Mock topilmadi");
    if (a.submittedAt || new Date() < a.deadline) return a;
    await this.finalize(a, a.deadline);
    return (await find()) ?? a;
  }

  /** Topshirilmagan va muddati o'tmagan urinish; aks holda 409 */
  private async ownOpen(userId: string, id: string): Promise<MockAttemptRow> {
    const a = await this.own(userId, id);
    if (a.submittedAt) throw new ConflictException("Mock topshirilgan yoki vaqt tugagan");
    return a;
  }
}
