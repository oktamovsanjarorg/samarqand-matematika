import { submittedCount } from "../weekly/submitted-count";
import { topicAnswersByUser } from "../common/answer-stats";
import { Injectable } from "@nestjs/common";
import { ADVICE, sortAdvice, type Advice } from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { AiHealth } from "../ai/ai-health";
import { PrismaService } from "../prisma/prisma.service";
import {
  aiAdvice,
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
    private readonly health: AiHealth,
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
      ...aiAdvice(this.health.get(), now),
      ...weeklyPlanAdvice({ planned, students: eligible }),
      ...weakTopicAdvice(answers, titles),
      ...participationAdvice(last && { ...last, eligible }, teacher),
      ...noTestTopicsAdvice(topics),
      ...draftAdvice(drafts),
    ]);
  }

  /** Mavzu testlaridagi avtomatik tekshirilgan javoblar (xodim sinovi va "faqat xatolar" kirmaydi), bazada sanalgan */
  private answers(now: Date) {
    return topicAnswersByUser(this.prisma, new Date(now.getTime() - ADVICE.days * DAY));
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
      select: { id: true, title: true },
    });
    // T-189: faqat shu test urinishlari sanaladi (`_count` barcha urinishlarni guruhlardi)
    return t && { title: t.title, submitted: await submittedCount(this.prisma, t.id) };
  }
}
