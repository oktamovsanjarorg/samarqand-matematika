import { Injectable, NotFoundException } from "@nestjs/common";
import type { ChildSummary } from "@samarqand/shared";
import { isFullAccess } from "../access/access-rules";
import { AccessService } from "../access/access.service";
import { StudentInsightsService } from "../insights/student-insights.service";
import { mockHistory } from "../mock/mock-history";
import { MyOfflineService } from "../offline/my-offline.service";
import { PrismaService } from "../prisma/prisma.service";
import { MySchoolService } from "../students/my-school.service";
import { StatsService } from "../topic-tests/stats.service";
import { weeklyHistory } from "../weekly/weekly-history";
import { openTests } from "./open-tests";

/**
 * Ota-ona kabineti (T-069, BR-PA01): faqat tasdiqlangan farzand, faqat faktlar.
 * AI shubhasi va ochiq testlar natijasi berilmaydi (BR-W05, BR-W08).
 */
@Injectable()
export class ChildSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessFacts: AccessService,
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
    const [access, stats, school, offline, recs, weekly, mocks, open] = await Promise.all([
      this.access(userId, now),
      this.stats.my(userId),
      this.school.get(userId),
      this.offline.list(userId),
      this.insights.recommendations(userId, now),
      weeklyHistory(this.prisma, userId, user.createdAt, { now, take: 5 }),
      mockHistory(this.prisma, userId, { now, take: 3 }),
      openTests(this.prisma, userId, now),
    ]);
    return {
      access,
      tests: stats.tests,
      averagePercent: stats.averagePercent,
      recent: stats.recent,
      group: school.group,
      attendance: school.attendance,
      weekly,
      // Testlar faqat to'liq kirishli o'quvchiga ochiq (BR-A04): aks holda "boshlamagan" chalg'itadi
      open: access.full ? open : [],
      mocks,
      offline,
      weak: recs.items.map((w) => ({ topicTitle: w.topicTitle, percent: w.percent, total: w.total })),
    };
  }

  /** BR-A04 qadamlari va faol obuna tugash sanasi (ketma-ket obunalarda eng kechi) */
  private async access(userId: string, now: Date): Promise<ChildSummary["access"]> {
    const [f, sub] = await Promise.all([
      this.accessFacts.facts(userId),
      this.prisma.subscription.findFirst({
        where: { userId, endsAt: { gt: now } },
        orderBy: { endsAt: "desc" },
        select: { endsAt: true },
      }),
    ]);
    return {
      full: isFullAccess(f),
      accepted: f.accepted,
      parentApproved: f.approvedParents > 0,
      paid: f.paid,
      paidUntil: sub?.endsAt.toISOString() ?? null,
    };
  }
}
