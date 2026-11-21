import type { PrismaClient } from "@samarqand/db";
import { approxScaled, examMaxRaw, gradeOf, type CardMockRow } from "@samarqand/shared";
import { snapshotOf } from "./admin-mocks.service";

/**
 * O'quvchining yopilgan mock'lari (T-112): saqlangan shkala balli, bo'lmasa taxminiy (BR-M05).
 * Oyna yopilguncha ko'rsatilmaydi (o'quvchi ham shu paytdan ko'radi). Scheduler Rasch qo'ymaguncha taxminiy.
 */
export async function mockHistory(
  prisma: Pick<PrismaClient, "mockAttempt">,
  userId: string,
  opts: { now: Date; take: number },
): Promise<CardMockRow[]> {
  const rows = await prisma.mockAttempt.findMany({
    where: { userId, submittedAt: { not: null }, mockTest: { closesAt: { lte: opts.now } } },
    orderBy: { mockTest: { closesAt: "desc" } },
    take: opts.take,
    select: {
      raw: true,
      scaled: true,
      mockTest: { select: { id: true, title: true, closesAt: true, template: true, raschN: true } },
    },
  });
  return rows.map(({ raw, scaled, mockTest: m }) => {
    const t = snapshotOf(m.template);
    const score = scaled ?? approxScaled(raw ?? 0, examMaxRaw(t.sections), t.scaleMax);
    return {
      id: m.id,
      title: m.title,
      closesAt: m.closesAt.toISOString(),
      scaled: score,
      scaleMax: t.scaleMax,
      grade: gradeOf(score, t.grades),
      approx: m.raschN === null,
    };
  });
}
