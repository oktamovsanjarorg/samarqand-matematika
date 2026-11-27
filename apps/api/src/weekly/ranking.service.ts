import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RANKING_TOP, rankRows, shortName, type Ranking } from "@samarqand/shared";
import { PrismaService } from "../prisma/prisma.service";
import { personName, PERSON_SELECT } from "../common/person";
import { scoreOf } from "./weekly-views";
import { RANKED } from "../common/ranked";

type Row = { userId: string; name: string; score: number };

/** Reyting jadvali: top va o'quvchining o'z qatori; boshqalarning ismi qisqartiriladi */
function toRanking(title: string, rows: Row[], me: string): Ranking {
  const ranked = rankRows(rows).map((r) => ({
    place: r.place,
    name: r.userId === me ? r.name : shortName(r.name),
    score: r.score,
    me: r.userId === me,
  }));
  return {
    title,
    participants: ranked.length,
    top: ranked.slice(0, RANKING_TOP),
    me: ranked.find((r) => r.me) ?? null,
  };
}

/** Reyting (BR-W10): faqat yopilgan testlar bo'yicha (BR-W08) */
@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async weekly(userId: string, testId: string, now: Date): Promise<Ranking> {
    const t = await this.prisma.weeklyTest.findFirst({
      where: { id: testId, isPublished: true },
      select: { title: true, closesAt: true },
    });
    if (!t) throw new NotFoundException("Test topilmadi");
    if (now < t.closesAt) throw new ForbiddenException("Reyting test yopilgach ochiladi");
    const attempts = await this.prisma.weeklyAttempt.findMany({
      where: { weeklyTestId: testId, ...RANKED },
      select: {
        userId: true,
        score: true,
        submittedAt: true,
        correct: true,
        user: { select: PERSON_SELECT },
      },
    });
    const rows = attempts.map((a) => ({ userId: a.userId, name: personName(a.user), score: scoreOf(a) }));
    return toRanking(t.title, rows, userId);
  }

  /**
   * Umumiy: barcha yopilgan haftalik testlar ballari yig'indisi. T-189: bazada yig'iladi (avval har urinish
   * JS'ga yuklanardi, har hafta yuzlab qator qo'shiladi). Ball scoreOf bilan bir xil: score, bo'lmasa topshirilgan
   * bo'lsa to'g'ri javoblar soni.
   */
  async overall(userId: string, now: Date): Promise<Ranking> {
    const sums = await this.prisma.$queryRaw<{ userId: string; score: number }[]>`
      SELECT wa."userId",
             SUM(COALESCE(wa."score", CASE WHEN wa."submittedAt" IS NOT NULL THEN COALESCE(wa."correct", 0) ELSE 0 END))::int AS score
      FROM "WeeklyAttempt" wa
      JOIN "WeeklyTest" wt ON wt."id" = wa."weeklyTestId"
      JOIN "User" u ON u."id" = wa."userId"
      WHERE wt."isPublished" = true AND wt."closesAt" <= ${now} AND u."role" = 'STUDENT'
      GROUP BY wa."userId"`;
    const users = await this.prisma.user.findMany({
      where: { id: { in: sums.map((r) => r.userId) } },
      select: { id: true, ...PERSON_SELECT },
    });
    const names = new Map(users.map((u) => [u.id, personName(u)]));
    const rows = sums.map((r) => ({
      userId: r.userId,
      name: names.get(r.userId) ?? "Oʻquvchi",
      score: r.score,
    }));
    return toRanking("Umumiy reyting", rows, userId);
  }
}
