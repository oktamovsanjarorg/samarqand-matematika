import { filterWhere } from "../students/admin-students.service";
import { retryGrowth } from "./retry-growth";
import { setupSteps } from "./setup-steps";
import { Injectable } from "@nestjs/common";
import type { AdminDashboard } from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { RANKED } from "../common/ranked";
import { tashkentDayStart } from "../common/time";
import { PrismaService } from "../prisma/prisma.service";

const DAY = 24 * 3600_000;

/** Admin bosh sahifa (T-061): faqat sonlar, shaxsiy ma'lumotsiz */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async get(now = new Date()): Promise<AdminDashboard> {
    const dayStart = tashkentDayStart(now);
    const today = new Date(dayStart.getTime() + 5 * 3600_000).toISOString().slice(0, 10);
    const p = this.prisma;
    const [newStudents, pendingParents, pendingPayments, unmatchedOffline, review, setup] = await Promise.all(
      [
        p.user.count({
          where: { role: "STUDENT", OR: [{ student: null }, { student: { acceptedAt: null } }] },
        }),
        p.parentLink.count({ where: { status: "PENDING" } }),
        p.payment.count({ where: { status: "PENDING" } }),
        p.offlineResult.count({ where: { userId: null } }),
        this.review(now),
        setupSteps(p),
      ],
    );
    const [
      students,
      activeToday,
      activeWeek,
      groups,
      marked,
      lastWeekly,
      parentsLinked,
      expiringSoon,
      retry,
    ] = await Promise.all([
      p.user.count({ where: { role: "STUDENT" } }),
      p.user.count({ where: { role: "STUDENT", lastSeenAt: { gte: dayStart } } }),
      p.user.count({ where: { role: "STUDENT", lastSeenAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
      p.group.count({ where: { isActive: true } }),
      p.attendance.groupBy({ by: ["groupId"], where: { date: new Date(`${today}T00:00:00Z`) } }),
      this.lastWeekly(now),
      p.studentProfile.count({
        where: { user: { role: "STUDENT" }, parents: { some: { status: "APPROVED" } } },
      }),
      p.user.count({ where: { role: "STUDENT", ...filterWhere("expiring", now) } }),
      retryGrowth(p, now),
    ]);
    return {
      setup,
      todo: { newStudents, pendingParents, pendingPayments, unmatchedOffline, review },
      stats: {
        students,
        activeToday,
        activeWeek,
        groups,
        groupsMarkedToday: marked.length,
        lastWeekly,
        parentsLinked,
        expiringSoon,
        retries: { count: retry.retries, improved: retry.improved },
      },
    };
  }

  /** Oxirgi yopilgan nashr qilingan haftalik test: necha o'quvchi topshirdi (xodimlarsiz, BR-W10) */
  private async lastWeekly(now: Date): Promise<AdminDashboard["stats"]["lastWeekly"]> {
    const t = await this.prisma.weeklyTest.findFirst({
      where: { isPublished: true, closesAt: { lte: now } },
      orderBy: { closesAt: "desc" },
      select: {
        id: true,
        title: true,
        _count: { select: { attempts: { where: { submittedAt: { not: null }, ...RANKED } } } },
      },
    });
    if (!t) return null;
    const eligible = (await this.access.fullAccessStudentIds()).length;
    return { testId: t.id, title: t.title, submitted: t._count.attempts, eligible };
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
