import { Injectable } from "@nestjs/common";
import type { IncomeMonth } from "@samarqand/shared";
import { personName, PERSON_SELECT } from "../common/person";
import { PrismaService } from "../prisma/prisma.service";

const TASHKENT_OFFSET = 5 * 3600_000;
const MAX_ROWS = 2000;

/** Toshkent oyi chegaralari UTC'da: [oy boshi, keyingi oy boshi) */
function bounds(month: string): { gte: Date; lt: Date } {
  const [y = 0, m = 0] = month.split("-").map(Number);
  return {
    gte: new Date(Date.UTC(y, m - 1, 1) - TASHKENT_OFFSET),
    lt: new Date(Date.UTC(y, m, 1) - TASHKENT_OFFSET),
  };
}

/** Oylik tushum (T-109): tasdiqlangan to'lovlar tasdiqlangan kuni bo'yicha; narx to'lov paytidagisi */
@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}

  async month(month: string): Promise<IncomeMonth> {
    const rows = await this.prisma.payment.findMany({
      where: { status: "APPROVED", reviewedAt: bounds(month) },
      orderBy: { reviewedAt: "asc" },
      take: MAX_ROWS,
      select: {
        amountUzs: true,
        reviewedAt: true,
        plan: { select: { name: true } },
        user: { select: PERSON_SELECT },
      },
    });
    const byPlan = new Map<string, { name: string; count: number; sumUzs: number }>();
    for (const r of rows) {
      const p = byPlan.get(r.plan.name) ?? { name: r.plan.name, count: 0, sumUzs: 0 };
      p.count += 1;
      p.sumUzs += r.amountUzs;
      byPlan.set(r.plan.name, p);
    }
    return {
      month,
      count: rows.length,
      sumUzs: rows.reduce((s, r) => s + r.amountUzs, 0),
      byPlan: [...byPlan.values()].sort((a, b) => b.sumUzs - a.sumUzs),
      rows: rows.map((r) => ({
        student: personName(r.user),
        plan: r.plan.name,
        amountUzs: r.amountUzs,
        approvedAt: (r.reviewedAt ?? new Date(0)).toISOString(),
      })),
    };
  }
}
