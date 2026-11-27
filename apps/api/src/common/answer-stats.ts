import { Prisma, type PrismaClient } from "@samarqand/db";

type Db = Pick<PrismaClient, "$queryRaw">;

/** O'quvchi va mavzu bo'yicha avtomatik tekshirilgan javoblar soni (to'g'ri / jami) */
export interface UserTopicAnswers {
  userId: string;
  topicId: string;
  ok: number;
  all: number;
}

/**
 * T-189: mavzu testlaridagi javoblar bazada sanaladi (avval har javob JS'ga yuklanardi, 100 ming javobda
 * soniyalab). Faqat o'quvchilar (RANKED), "faqat xatolar" urinishlari kirmaydi, MANUAL javoblar sanalmaydi.
 */
export async function topicAnswersByUser(prisma: Db, from: Date, to?: Date): Promise<UserTopicAnswers[]> {
  const upper = to ? Prisma.sql`AND ta."submittedAt" < ${to}` : Prisma.empty;
  return prisma.$queryRaw<UserTopicAnswers[]>`
    SELECT ta."userId", ta."topicId",
           (count(*) FILTER (WHERE an."result" = 'CORRECT'))::int AS ok, count(*)::int AS "all"
    FROM "TopicAnswer" an
    JOIN "TopicAttempt" ta ON ta."id" = an."attemptId"
    JOIN "User" u ON u."id" = ta."userId"
    WHERE an."result" IN ('CORRECT', 'WRONG') AND ta."mistakesOnly" = false AND u."role" = 'STUDENT'
      AND ta."submittedAt" >= ${from} ${upper}
    GROUP BY ta."userId", ta."topicId"`;
}

/** Har urinish foizi (avtomatik tekshirilganlar), o'quvchi bo'yicha, eskidan yangiga */
export async function attemptPercents(prisma: Db, userIds: string[], from: Date) {
  if (!userIds.length) return new Map<string, number[]>();
  const rows = await prisma.$queryRaw<{ userId: string; ok: number; all: number }[]>`
    SELECT ta."userId", (count(*) FILTER (WHERE an."result" = 'CORRECT'))::int AS ok, count(*)::int AS "all"
    FROM "TopicAttempt" ta
    JOIN "TopicAnswer" an ON an."attemptId" = ta."id" AND an."result" IN ('CORRECT', 'WRONG')
    WHERE ta."userId" IN (${Prisma.join(userIds)}) AND ta."submittedAt" >= ${from} AND ta."mistakesOnly" = false
    GROUP BY ta."id", ta."userId", ta."submittedAt"
    ORDER BY ta."submittedAt" ASC, ta."id" ASC`;
  const out = new Map<string, number[]>();
  for (const r of rows) out.set(r.userId, [...(out.get(r.userId) ?? []), Math.round((r.ok / r.all) * 100)]);
  return out;
}

/** Har mavzu urinishi: to'g'ri va avtomatik tekshiriladigan javoblar soni, o'quvchi bo'yicha (T-189) */
export async function topicAttemptChecks(prisma: Db, userIds: string[]) {
  const out = new Map<string, { correct: number; checkable: number }[]>();
  if (!userIds.length) return out;
  const rows = await prisma.$queryRaw<{ userId: string; correct: number; checkable: number }[]>`
    SELECT ta."userId", COALESCE(ta."correct", 0)::int AS correct, count(an."attemptId")::int AS checkable
    FROM "TopicAttempt" ta
    LEFT JOIN "TopicAnswer" an ON an."attemptId" = ta."id" AND an."result" IN ('CORRECT', 'WRONG')
    WHERE ta."userId" IN (${Prisma.join(userIds)}) AND ta."submittedAt" IS NOT NULL AND ta."mistakesOnly" = false
    GROUP BY ta."id", ta."userId", ta."correct"`;
  for (const r of rows)
    out.set(r.userId, [...(out.get(r.userId) ?? []), { correct: r.correct, checkable: r.checkable }]);
  return out;
}
