import type { PrismaClient } from "@samarqand/db";
import { rankRows, type ChildWeeklyRow } from "@samarqand/shared";
import { RANKED } from "../common/ranked";
import { scoreOf } from "./weekly-views";

/**
 * O'quvchining yopilgan haftalik testlari (T-069, T-111): ro'yxatdan o'tgandan keyingilari,
 * topshirmagan bo'lsa ham ko'rinadi (0 ball). Reyting BR-W10 bilan bir xil: faqat o'quvchilar (T-087).
 */
export async function weeklyHistory(
  prisma: Pick<PrismaClient, "weeklyTest">,
  userId: string,
  since: Date,
  opts: { now: Date; take: number },
): Promise<ChildWeeklyRow[]> {
  const tests = await prisma.weeklyTest.findMany({
    where: { isPublished: true, closesAt: { lte: opts.now, gte: since } },
    orderBy: { closesAt: "desc" },
    take: opts.take,
    select: {
      id: true,
      title: true,
      closesAt: true,
      _count: { select: { questions: true } },
      attempts: { where: RANKED, select: { userId: true, score: true, submittedAt: true, correct: true } },
    },
  });
  return tests.map((t) => {
    const ranked = rankRows(t.attempts.map((a) => ({ name: a.userId, score: scoreOf(a) })));
    const a = t.attempts.find((x) => x.userId === userId);
    const submitted = !!a?.submittedAt;
    return {
      id: t.id,
      title: t.title,
      closesAt: t.closesAt.toISOString(),
      total: t._count.questions,
      submitted,
      score: a ? scoreOf(a) : 0,
      place: submitted ? (ranked.find((r) => r.name === userId)?.place ?? null) : null,
      participants: ranked.length,
    };
  });
}
