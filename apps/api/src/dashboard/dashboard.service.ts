import { Injectable } from "@nestjs/common";
import type { AdminDashboard } from "@samarqand/shared";
import { tashkentDayStart } from "../common/time";
import { PrismaService } from "../prisma/prisma.service";

const DAY = 24 * 3600_000;

/** Admin bosh sahifa (T-061): faqat sonlar, shaxsiy ma'lumotsiz */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(now = new Date()): Promise<AdminDashboard> {
    const dayStart = tashkentDayStart(now);
    const today = new Date(dayStart.getTime() + 5 * 3600_000).toISOString().slice(0, 10);
    const p = this.prisma;
    const [newStudents, pendingParents, pendingPayments, unmatchedOffline, review] = await Promise.all([
      p.user.count({
        where: { role: "STUDENT", OR: [{ student: null }, { student: { acceptedAt: null } }] },
      }),
      p.parentLink.count({ where: { status: "PENDING" } }),
      p.payment.count({ where: { status: "PENDING" } }),
      p.offlineResult.count({ where: { userId: null } }),
      this.review(now),
    ]);
    const [students, activeToday, activeWeek, groups, marked] = await Promise.all([
      p.user.count({ where: { role: "STUDENT" } }),
      p.user.count({ where: { role: "STUDENT", lastSeenAt: { gte: dayStart } } }),
      p.user.count({ where: { role: "STUDENT", lastSeenAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
      p.group.count({ where: { isActive: true } }),
      p.attendance.groupBy({ by: ["groupId"], where: { date: new Date(`${today}T00:00:00Z`) } }),
    ]);
    return {
      todo: { newStudents, pendingParents, pendingPayments, unmatchedOffline, review },
      stats: { students, activeToday, activeWeek, groups, groupsMarkedToday: marked.length },
    };
  }

  /** Yopilgan testlarda rasmli, lekin ustoz hali baholamagan javoblar */
  private async review(now: Date) {
    const rows = await this.prisma.weeklyAnswer.groupBy({
      by: ["attemptId"],
      where: {
        reviewedAt: null,
        photos: { some: {} },
        attempt: { submittedAt: { not: null }, weeklyTest: { closesAt: { lte: now } } },
      },
      _count: { _all: true },
    });
    if (!rows.length) return [];
    const attempts = await this.prisma.weeklyAttempt.findMany({
      where: { id: { in: rows.map((r) => r.attemptId) } },
      select: { id: true, weeklyTest: { select: { id: true, title: true } } },
    });
    const byTest = new Map<string, { testId: string; title: string; count: number }>();
    for (const r of rows) {
      const t = attempts.find((a) => a.id === r.attemptId)?.weeklyTest;
      if (!t) continue;
      const cur = byTest.get(t.id) ?? { testId: t.id, title: t.title, count: 0 };
      cur.count += r._count._all;
      byTest.set(t.id, cur);
    }
    return [...byTest.values()].sort((a, b) => b.count - a.count);
  }
}
