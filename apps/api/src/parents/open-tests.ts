import type { PrismaClient } from "@samarqand/db";
import type { ChildOpenTest } from "@samarqand/shared";

type Attempt = { submittedAt: Date | null }[];

const status = (attempts: Attempt): ChildOpenTest["status"] =>
  attempts.length === 0 ? "not_started" : attempts.some((a) => a.submittedAt) ? "submitted" : "started";

/**
 * Hozir ochiq haftalik va mock testlar (T-138): ota-ona muddat tugashidan oldin farzandiga eslatishi uchun.
 * Faqat holat (topshirdi, boshlagan, boshlamagan) va muddat; ball oyna yopilgach (BR-W08).
 */
export async function openTests(
  prisma: Pick<PrismaClient, "weeklyTest" | "mockTest">,
  userId: string,
  now: Date,
): Promise<ChildOpenTest[]> {
  const where = { isPublished: true, opensAt: { lte: now }, closesAt: { gt: now } };
  const select = {
    id: true,
    title: true,
    closesAt: true,
    attempts: { where: { userId }, select: { submittedAt: true } },
  };
  const [weekly, mocks] = await Promise.all([
    prisma.weeklyTest.findMany({ where, select }),
    prisma.mockTest.findMany({ where, select }),
  ]);
  const row = (kind: ChildOpenTest["kind"]) => (t: (typeof weekly)[number]) => ({
    id: t.id,
    kind,
    title: t.title,
    closesAt: t.closesAt.toISOString(),
    status: status(t.attempts),
  });
  return [...weekly.map(row("weekly")), ...mocks.map(row("mock"))].sort((a, b) =>
    a.closesAt.localeCompare(b.closesAt),
  );
}
