import { Injectable, NotFoundException } from "@nestjs/common";
import {
  questionPoints,
  sectionScores,
  type StudentOfflineDetail,
  type StudentOfflineResult,
} from "@samarqand/shared";
import { PrismaService } from "../prisma/prisma.service";
import { asRasch, asSections, day } from "./offline-views";

const RESULT = {
  id: true,
  offlineTestId: true,
  correct: true,
  percent: true,
  score: true,
  grade: true,
  offlineTest: {
    select: {
      title: true,
      date: true,
      questionCount: true,
      scaleMax: true,
      _count: { select: { results: true } },
    },
  },
} as const;

type Rec = {
  id: string;
  offlineTestId: string;
  correct: number;
  percent: number;
  score: number;
  grade: string | null;
  offlineTest: {
    title: string;
    date: Date;
    questionCount: number;
    scaleMax: number;
    _count: { results: number };
  };
};

/** O'quvchi o'z offline natijalarini ko'radi (T-181); ota-ona tasdiqlangan farzandinikini */
@Injectable()
export class MyOfflineService {
  constructor(private readonly prisma: PrismaService) {}

  private async view(r: Rec): Promise<StudentOfflineResult> {
    const above = await this.prisma.offlineResult.count({
      where: { offlineTestId: r.offlineTestId, score: { gt: r.score } },
    });
    const t = r.offlineTest;
    return {
      id: r.id,
      title: t.title,
      date: day(t.date),
      questionCount: t.questionCount,
      correct: r.correct,
      percent: r.percent,
      score: r.score,
      scaleMax: t.scaleMax,
      grade: r.grade,
      place: above + 1,
      participants: t._count.results,
    };
  }

  async list(userId: string): Promise<StudentOfflineResult[]> {
    const mine = await this.prisma.offlineResult.findMany({
      where: { userId },
      orderBy: { offlineTest: { date: "desc" } },
      take: 50,
      select: RESULT,
    });
    return Promise.all(mine.map((r) => this.view(r)));
  }

  /** O'quvchi o'ziniki, ota-ona faqat tasdiqlangan farzandiniki; boshqa holatda 404 */
  async detail(viewer: { id: string; role: string }, id: string): Promise<StudentOfflineDetail> {
    const owner =
      viewer.role === "PARENT"
        ? { user: { student: { parents: { some: { parentId: viewer.id, status: "APPROVED" as const } } } } }
        : { userId: viewer.id };
    const r = await this.prisma.offlineResult.findFirst({
      where: { id, ...owner },
      select: {
        ...RESULT,
        wrong: true,
        blank: true,
        answers: true,
        offlineTest: { select: { ...RESULT.offlineTest.select, sections: true, rasch: true } },
      },
    });
    if (!r) throw new NotFoundException("Natija topilmadi");
    const avg = await this.prisma.offlineResult.aggregate({
      where: { offlineTestId: r.offlineTestId },
      _avg: { percent: true },
    });
    const w = asRasch(r.offlineTest.rasch, r.offlineTest.questionCount).items.map((i) => i.w);
    return {
      ...(await this.view(r)),
      wrong: r.wrong,
      blank: r.blank,
      answers: r.answers,
      points: questionPoints(r.answers, r.score, w),
      sections: sectionScores(asSections(r.offlineTest.sections), r.answers, r.score, w),
      avgPercent: Math.round((avg._avg.percent ?? 0) * 10) / 10,
    };
  }
}
