import { Injectable } from "@nestjs/common";
import { MISTAKES_LIMIT, type Mistake } from "@samarqand/shared";
import { PrismaService } from "../prisma/prisma.service";
import { resultItems } from "./attempt-views";

/** Bitta o'quvchining avtomatik tekshirilgan javoblari tarixi chegarasi */
const HISTORY = 3000;

/**
 * Xatolarim (T-079): mavzu testlarida savolga oxirgi javob WRONG bo'lsa ro'yxatga tushadi.
 * Keyingi urinishda to'g'ri ishlansa chiqib ketadi. Ustoz tekshiradigan (MANUAL) javoblar hisobga olinmaydi.
 */
@Injectable()
export class MistakesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<Mistake[]> {
    const rows = await this.prisma.topicAnswer.findMany({
      where: {
        attempt: { userId, submittedAt: { not: null } },
        result: { in: ["CORRECT", "WRONG"] },
        question: { isPublished: true },
      },
      orderBy: [{ attempt: { submittedAt: "desc" } }],
      take: HISTORY,
      select: {
        questionId: true,
        response: true,
        result: true,
        question: true,
        attempt: { select: { submittedAt: true, topicId: true, topic: { select: { title: true } } } },
      },
    });
    const latest = new Map<string, (typeof rows)[number]>();
    const wrong = new Map<string, number>();
    for (const r of rows) {
      if (!latest.has(r.questionId)) latest.set(r.questionId, r);
      if (r.result === "WRONG") wrong.set(r.questionId, (wrong.get(r.questionId) ?? 0) + 1);
    }
    return [...latest.values()]
      .filter((r) => r.result === "WRONG")
      .slice(0, MISTAKES_LIMIT)
      .map((r) => ({
        topicId: r.attempt.topicId,
        topicTitle: r.attempt.topic.title,
        at: (r.attempt.submittedAt ?? new Date()).toISOString(),
        times: wrong.get(r.questionId) ?? 1,
        item: resultItems([r])[0] ?? never(),
      }));
  }
}

function never(): never {
  throw new Error("natija qatori yo'q");
}
