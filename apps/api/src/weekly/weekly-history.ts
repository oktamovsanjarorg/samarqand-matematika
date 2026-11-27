import { Prisma, type PrismaClient } from "@samarqand/db";
import type { ChildWeeklyRow } from "@samarqand/shared";

type Row = {
  id: string;
  title: string;
  closesAt: Date;
  total: number;
  submitted: boolean;
  score: number;
  place: number | null;
  participants: number;
};

/**
 * O'quvchining yopilgan haftalik testlari (T-069, T-111): ro'yxatdan o'tgandan keyingilari,
 * topshirmagan bo'lsa ham ko'rinadi (0 ball). Reyting BR-W10 bilan bir xil: faqat o'quvchilar (T-087),
 * ball scoreOf bilan bir xil, teng ball bir xil o'rin (rankRows: 1, 1, 3), o'rin faqat topshirgan bo'lsa.
 * T-189: o'rin bazada RANK() bilan hisoblanadi (avval har test barcha urinishlari JS'ga yuklanardi).
 */
export async function weeklyHistory(
  prisma: Pick<PrismaClient, "$queryRaw">,
  userId: string,
  since: Date,
  opts: { now: Date; take: number; submittedOnly?: boolean },
): Promise<ChildWeeklyRow[]> {
  // T-172: faqat o'quvchi topshirgan testlar (o'rni bo'lmagan testlar kerak bo'lmasa)
  const mine = opts.submittedOnly
    ? Prisma.sql`AND EXISTS (SELECT 1 FROM "WeeklyAttempt" m
        WHERE m."weeklyTestId" = wt."id" AND m."userId" = ${userId} AND m."submittedAt" IS NOT NULL)`
    : Prisma.empty;
  const rows = await prisma.$queryRaw<Row[]>`
    WITH t AS (
      SELECT wt."id", wt."title", wt."closesAt" FROM "WeeklyTest" wt
      WHERE wt."isPublished" = true AND wt."closesAt" <= ${opts.now} AND wt."closesAt" >= ${since} ${mine}
      ORDER BY wt."closesAt" DESC
      LIMIT ${opts.take}
    ), r AS (
      SELECT wa."weeklyTestId", wa."userId", wa."submittedAt", s.score,
             RANK() OVER (PARTITION BY wa."weeklyTestId" ORDER BY s.score DESC)::int AS place,
             count(*) OVER (PARTITION BY wa."weeklyTestId")::int AS participants
      FROM "WeeklyAttempt" wa
      JOIN "User" u ON u."id" = wa."userId" AND u."role" = 'STUDENT'
      CROSS JOIN LATERAL (
        SELECT COALESCE(wa."score", CASE WHEN wa."submittedAt" IS NOT NULL THEN COALESCE(wa."correct", 0) ELSE 0 END)::int AS score
      ) s
      WHERE wa."weeklyTestId" IN (SELECT "id" FROM t)
    )
    SELECT t."id", t."title", t."closesAt",
           (SELECT count(*)::int FROM "WeeklyQuestion" q WHERE q."weeklyTestId" = t."id") AS total,
           (me."submittedAt" IS NOT NULL) AS submitted,
           COALESCE(me.score, 0) AS score,
           CASE WHEN me."submittedAt" IS NOT NULL THEN me.place END AS place,
           COALESCE((SELECT max(x.participants) FROM r x WHERE x."weeklyTestId" = t."id"), 0) AS participants
    FROM t
    LEFT JOIN r me ON me."weeklyTestId" = t."id" AND me."userId" = ${userId}
    ORDER BY t."closesAt" DESC`;
  return rows.map((r) => ({ ...r, closesAt: r.closesAt.toISOString() }));
}
