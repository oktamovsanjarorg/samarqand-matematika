import { Injectable } from "@nestjs/common";
import { INSIGHT_DAYS, type MyRecommendations } from "@samarqand/shared";
import { PrismaService } from "../prisma/prisma.service";
import { weakTopics, type AnswerFact } from "./topic-weakness";

const Q = { select: { topicId: true, skills: true } } as const;
const CHECKED = { in: ["CORRECT", "WRONG"] as ("CORRECT" | "WRONG")[] };

/**
 * O'quvchiga tavsiya (T-062, BR-R01): kuchsiz mavzular faqat faktlardan.
 * Haftalik va mock faqat yopilgandan keyin hisobga olinadi: ochiq testda to'g'ri javob sizib chiqmaydi.
 */
@Injectable()
export class StudentInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendations(userId: string, now = new Date()): Promise<MyRecommendations> {
    const facts = await this.facts(userId, now);
    const weak = weakTopics(facts);
    const topics = await this.prisma.topic.findMany({
      where: { id: { in: weak.map((w) => w.topicId) } },
      select: {
        id: true,
        title: true,
        lessons: { where: { isPublished: true }, orderBy: { order: "asc" }, take: 1, select: { id: true } },
      },
    });
    const items = weak.map((w) => {
      const t = topics.find((x) => x.id === w.topicId);
      return { ...w, topicTitle: t?.title ?? "Mavzu", lessonId: t?.lessons[0]?.id ?? null };
    });
    return { basis: facts.length, items };
  }

  private async facts(userId: string, now: Date): Promise<AnswerFact[]> {
    const since = new Date(now.getTime() - INSIGHT_DAYS * 24 * 3600_000);
    const [topic, weekly, mock] = await Promise.all([
      this.prisma.topicAnswer.findMany({
        where: { result: CHECKED, attempt: { userId, submittedAt: { gte: since }, mistakesOnly: false } },
        select: { result: true, question: Q },
      }),
      this.prisma.weeklyAnswer.findMany({
        where: {
          OR: [{ result: CHECKED }, { teacherPoints: { not: null } }],
          attempt: { userId, submittedAt: { gte: since }, weeklyTest: { closesAt: { lte: now } } },
        },
        select: { result: true, teacherPoints: true, question: Q },
      }),
      this.prisma.mockAnswer.findMany({
        where: {
          result: CHECKED,
          attempt: { userId, submittedAt: { gte: since }, mockTest: { closesAt: { lte: now } } },
        },
        select: { result: true, question: Q },
      }),
    ]);
    const fact = (
      q: { topicId: string; skills: string[] },
      correct: boolean,
      source: AnswerFact["source"],
    ) => ({
      topicId: q.topicId,
      skills: q.skills,
      correct,
      source,
    });
    return [
      ...topic.map((a) => fact(a.question, a.result === "CORRECT", "topic")),
      // Ustoz bahosi avtomatik natijadan ustun (BR-W06)
      ...weekly.map((a) =>
        fact(a.question, a.teacherPoints !== null ? a.teacherPoints > 0 : a.result === "CORRECT", "weekly"),
      ),
      ...mock.map((a) => fact(a.question, a.result === "CORRECT", "mock")),
    ];
  }
}
