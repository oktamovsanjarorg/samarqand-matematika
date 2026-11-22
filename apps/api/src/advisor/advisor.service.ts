import { Injectable } from "@nestjs/common";
import { ADVICE, sortAdvice, type Advice } from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { RANKED } from "../common/ranked";
import { PrismaService } from "../prisma/prisma.service";
import {
  draftAdvice,
  noTestTopicsAdvice,
  participationAdvice,
  weakTopicAdvice,
  weeklyPlanAdvice,
  type LastWeekly,
} from "./advice";

const DAY = 24 * 3600_000;

/** Maslahatchi (T-161): bazadagi faktlarni yig'adi, qoidalar advice.ts da */
@Injectable()
export class AdvisorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(teacher: boolean, now = new Date()): Promise<Advice[]> {
    const [answers, topics, planned, students, drafts, last] = await Promise.all([
      this.answers(now),
      this.topics(),
      this.weeklyPlanned(now),
      this.access.fullAccessStudentIds(),
      this.drafts(now),
      this.lastWeekly(now),
    ]);
    const titles = new Map(topics.map((t) => [t.id, t.title]));
    const eligible = students.length;
    return sortAdvice([
      ...weeklyPlanAdvice({ planned, students: eligible }),
      ...weakTopicAdvice(answers, titles),
      ...participationAdvice(last && { ...last, eligible }, teacher),
      ...noTestTopicsAdvice(topics),
      ...draftAdvice(drafts),
    ]);
  }

  /** Mavzu testlaridagi avtomatik tekshirilgan javoblar (xodim sinovi va "faqat xatolar" kirmaydi) */
  private async answers(now: Date) {
    const rows = await this.prisma.topicAnswer.findMany({
      where: {
        result: { in: ["CORRECT", "WRONG"] },
        attempt: {
          submittedAt: { gte: new Date(now.getTime() - ADVICE.days * DAY) },
          mistakesOnly: false,
          ...RANKED,
        },
      },
      select: {
        result: true,
        question: { select: { topicId: true } },
        attempt: { select: { userId: true } },
      },
      take: 50_000,
    });
    return rows.map((r) => ({
      topicId: r.question.topicId,
      userId: r.attempt.userId,
      correct: r.result === "CORRECT",
    }));
  }

  /** Nashr qilingan kurslardagi mavzular: nashr qilingan dars va savollar soni */
  private async topics() {
    const rows = await this.prisma.topic.findMany({
      where: { course: { isPublished: true } },
      orderBy: [{ course: { order: "asc" } }, { order: "asc" }],
      select: {
        id: true,
        title: true,
        _count: {
          select: { lessons: { where: { isPublished: true } }, questions: { where: { isPublished: true } } },
        },
      },
    });
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      lessons: t._count.lessons,
      questions: t._count.questions,
    }));
  }

  /** Ochiq yoki 7 kun ichida ochiladigan nashr qilingan haftalik test bormi */
  private async weeklyPlanned(now: Date) {
    const n = await this.prisma.weeklyTest.count({
      where: {
        isPublished: true,
        closesAt: { gt: now },
        opensAt: { lte: new Date(now.getTime() + ADVICE.weeklyAheadDays * DAY) },
      },
    });
    return n > 0;
  }

  /** Eski qoralama savollar: haftalik yoki mockka qo'shilganlari ataylab yashirin (T-157), ular hisobga kirmaydi */
  private drafts(now: Date) {
    return this.prisma.question.count({
      where: {
        isPublished: false,
        createdAt: { lt: new Date(now.getTime() - ADVICE.draftDays * DAY) },
        weeklyQuestions: { none: {} },
        mockQuestions: { none: {} },
      },
    });
  }

  private async lastWeekly(now: Date): Promise<Omit<LastWeekly, "eligible"> | null> {
    const t = await this.prisma.weeklyTest.findFirst({
      where: { isPublished: true, closesAt: { lte: now } },
      orderBy: { closesAt: "desc" },
      select: {
        title: true,
        _count: { select: { attempts: { where: { submittedAt: { not: null }, ...RANKED } } } },
      },
    });
    return t && { title: t.title, submitted: t._count.attempts };
  }
}
