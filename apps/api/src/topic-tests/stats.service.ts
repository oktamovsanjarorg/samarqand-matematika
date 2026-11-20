import { Injectable } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import type { AttemptSummary, MyStats } from "@samarqand/shared";
import { PrismaService } from "../prisma/prisma.service";
import { averagePercent, topicTable } from "./stats";

const AUTO_CHECKED: Prisma.TopicAnswerWhereInput = { result: { in: ["CORRECT", "WRONG"] } };

/** O'quvchining o'z statistikasi (T-024). Faqat o'z urinishlari, javob kalitlari o'qilmaydi */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async my(userId: string): Promise<MyStats> {
    const [done, open] = await Promise.all([this.submitted(userId), this.open(userId)]);
    return {
      open,
      tests: done.length,
      averagePercent: averagePercent(done),
      recent: done.slice(0, 5),
      topics: topicTable(done),
    };
  }

  private async submitted(userId: string): Promise<AttemptSummary[]> {
    const rows = await this.prisma.topicAttempt.findMany({
      where: { userId, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        topicId: true,
        submittedAt: true,
        correct: true,
        topic: { select: { title: true } },
        _count: { select: { answers: { where: AUTO_CHECKED } } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      topicId: r.topicId,
      topicTitle: r.topic.title,
      correct: r.correct ?? 0,
      checkable: r._count.answers,
      submittedAt: (r.submittedAt ?? new Date()).toISOString(),
    }));
  }

  private async open(userId: string): Promise<MyStats["open"]> {
    const a = await this.prisma.topicAttempt.findFirst({
      where: { userId, submittedAt: null },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        topicId: true,
        topic: { select: { title: true } },
        answers: { select: { response: true } },
      },
    });
    if (!a) return null;
    return {
      attemptId: a.id,
      topicId: a.topicId,
      topicTitle: a.topic.title,
      answered: a.answers.filter((x) => x.response !== null).length,
      total: a.answers.length,
    };
  }
}
