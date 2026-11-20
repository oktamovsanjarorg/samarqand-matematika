import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RANKING_TOP, rankRows, shortName, type Ranking } from "@samarqand/shared";
import { PrismaService } from "../prisma/prisma.service";
import { personName, PERSON_SELECT } from "../common/person";
import { scoreOf } from "./weekly-views";

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
      where: { weeklyTestId: testId },
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

  /** Umumiy: barcha yopilgan haftalik testlar ballari yig'indisi */
  async overall(userId: string, now: Date): Promise<Ranking> {
    const attempts = await this.prisma.weeklyAttempt.findMany({
      where: { weeklyTest: { isPublished: true, closesAt: { lte: now } } },
      select: {
        userId: true,
        score: true,
        submittedAt: true,
        correct: true,
        user: { select: PERSON_SELECT },
      },
    });
    const sums = new Map<string, Row>();
    for (const a of attempts) {
      const row = sums.get(a.userId) ?? { userId: a.userId, name: personName(a.user), score: 0 };
      row.score += scoreOf(a);
      sums.set(a.userId, row);
    }
    return toRanking("Umumiy reyting", [...sums.values()], userId);
  }
}
