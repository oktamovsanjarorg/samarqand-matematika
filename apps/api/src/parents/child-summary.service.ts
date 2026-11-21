import { Injectable, NotFoundException } from "@nestjs/common";
import type { ChildSummary } from "@samarqand/shared";
import { StudentInsightsService } from "../insights/student-insights.service";
import { MyOfflineService } from "../offline/my-offline.service";
import { PrismaService } from "../prisma/prisma.service";
import { MySchoolService } from "../students/my-school.service";
import { StatsService } from "../topic-tests/stats.service";
import { scoreOf } from "../weekly/weekly-views";

/**
 * Ota-ona kabineti (T-069, BR-PA01): faqat tasdiqlangan farzand, faqat faktlar.
 * AI shubhasi va ochiq testlar natijasi berilmaydi (BR-W05, BR-W08).
 */
@Injectable()
export class ChildSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly school: MySchoolService,
    private readonly offline: MyOfflineService,
    private readonly insights: StudentInsightsService,
  ) {}

  async get(parentId: string, studentId: string, now = new Date()): Promise<ChildSummary> {
    const link = await this.prisma.parentLink.findFirst({
      where: { parentId, studentId, status: "APPROVED" },
      select: { student: { select: { userId: true, user: { select: { createdAt: true } } } } },
    });
    if (!link) throw new NotFoundException("Farzand topilmadi");
    const { userId, user } = link.student;
    const [stats, school, offline, recs, weekly] = await Promise.all([
      this.stats.my(userId),
      this.school.get(userId),
      this.offline.list(userId),
      this.insights.recommendations(userId, now),
      this.weekly(userId, user.createdAt, now),
    ]);
    return {
      tests: stats.tests,
      averagePercent: stats.averagePercent,
      recent: stats.recent,
      group: school.group,
      attendance: school.attendance,
      weekly,
      offline,
      weak: recs.items.map((w) => ({ topicTitle: w.topicTitle, percent: w.percent, total: w.total })),
    };
  }

  /** Ro'yxatdan o'tgandan keyin yopilgan oxirgi 5 haftalik: topshirmagan bo'lsa ham ko'rinadi (0 ball) */
  private async weekly(userId: string, since: Date, now: Date) {
    const tests = await this.prisma.weeklyTest.findMany({
      where: { isPublished: true, closesAt: { lte: now, gte: since } },
      orderBy: { closesAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        closesAt: true,
        _count: { select: { questions: true } },
        attempts: { where: { userId }, select: { score: true, submittedAt: true, correct: true } },
      },
    });
    return tests.map((t) => {
      const a = t.attempts[0];
      return {
        id: t.id,
        title: t.title,
        closesAt: t.closesAt.toISOString(),
        total: t._count.questions,
        submitted: !!a?.submittedAt,
        score: a ? scoreOf(a) : 0,
      };
    });
  }
}
