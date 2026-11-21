import type { PrismaClient } from "@samarqand/db";

const DAY = 86_400_000;
export const RETRY_WINDOW_DAYS = 30;

/**
 * Muvaffaqiyat o'lchovi (00-vision, T-133): o'quvchi mavzu testini qayta ishlaganda natija oldingisidan oshdimi.
 * Oxirgi 30 kundagi qayta urinishlar (shu mavzuda oldingi topshirilgan urinishi bor), faqat o'quvchilar (BR-W10),
 * "xatolar ustida ishlash" urinishlari (T-104) hisobga kirmaydi: ularda savollar boshqa.
 */
export async function retryGrowth(
  prisma: Pick<PrismaClient, "$queryRaw">,
  now: Date,
): Promise<{ retries: number; improved: number }> {
  const since = new Date(now.getTime() - RETRY_WINDOW_DAYS * DAY);
  const [row] = await prisma.$queryRaw<{ retries: number; improved: number }[]>`
    WITH a AS (
      SELECT ta."userId", ta."topicId", ta."submittedAt",
             ta."correct"::float / NULLIF((SELECT count(*) FROM "TopicAnswer" x WHERE x."attemptId" = ta."id"), 0) AS pct
      FROM "TopicAttempt" ta
      JOIN "User" u ON u."id" = ta."userId"
      WHERE ta."submittedAt" IS NOT NULL AND ta."mistakesOnly" = false AND u."role" = 'STUDENT'
    ), b AS (
      SELECT *, LAG(pct) OVER (PARTITION BY "userId", "topicId" ORDER BY "submittedAt") AS prev FROM a
    )
    SELECT count(*)::int AS retries, (count(*) FILTER (WHERE pct > prev))::int AS improved
    FROM b
    WHERE prev IS NOT NULL AND pct IS NOT NULL AND "submittedAt" >= ${since} AND "submittedAt" <= ${now}`;
  return { retries: row?.retries ?? 0, improved: row?.improved ?? 0 };
}
