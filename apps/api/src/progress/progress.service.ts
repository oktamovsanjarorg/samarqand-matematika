import { Injectable } from "@nestjs/common";
import { Prisma } from "@samarqand/db";
import { PROGRESS_LOOKBACK_DAYS, type MyProgress } from "@samarqand/shared";
import { countMap } from "../common/count-map";
import { tashkentDayStart } from "../common/time";
import { PrismaService } from "../prisma/prisma.service";
import { StatsService } from "../topic-tests/stats.service";
import { weeklyHistory } from "../weekly/weekly-history";
import { badgesOf, dayKey, masteredCount, streakOf, weekOf } from "./progress-calc";

const DAY_MS = 24 * 60 * 60_000;
/** Javob berilgan savol: bo'sh qoldirilganlar sanalmaydi */
const ANSWERED = { response: { not: Prisma.AnyNull } };
const SUBMITTED_SINCE = (userId: string, since: Date) => ({ userId, submittedAt: { gte: since } });
const ACTIVITY = { id: true, submittedAt: true } as const;
const ids = (rows: { id: string }[]) => ({ in: rows.map((r) => r.id) });

/**
 * O'quvchining yutuqlari (T-169, BR-R05). Faollik kuni: o'sha kuni topshirilgan mavzu testi, haftalik yoki mock
 * (ustoz keyin tekshirsa faollik kuni o'zgarmaydi). Faqat o'z ma'lumoti, javob kalitlari o'qilmaydi.
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  async my(userId: string, now = new Date()): Promise<MyProgress> {
    const since = new Date(tashkentDayStart(now).getTime() - PROGRESS_LOOKBACK_DAYS * DAY_MS);
    const [activity, my, available, answers, weekly, attendance] = await Promise.all([
      this.activity(userId, since),
      this.stats.my(userId),
      this.availableTopics(),
      this.answers(userId),
      weeklyHistory(this.prisma, userId, new Date(0), { now, take: 50, submittedOnly: true }),
      this.attendance(userId, now),
    ]);
    const best = my.topics.filter((t) => available.has(t.topicId)).map((t) => t.bestPercent);
    const streak = streakOf(new Set(activity.map((a) => a.day)), now);
    const places = weekly.flatMap((w) => (w.place === null ? [] : [w.place]));
    const last = weekly.find((w) => w.place !== null);
    return {
      streak,
      week: weekOf(
        activity.flatMap((a) => Array<string>(a.answers).fill(a.day)),
        now,
      ),
      topics: { mastered: masteredCount(best), started: best.length, available: available.size },
      answers,
      weekly: last ? { title: last.title, place: last.place ?? 0, participants: last.participants } : null,
      attendance,
      badges: badgesOf({
        tests: my.tests,
        answers: answers.checked,
        bestStreak: streak.best,
        mastered: masteredCount(best),
        bestWeeklyPlace: places.length ? Math.min(...places) : null,
      }),
    };
  }

  /**
   * T-189: javoblar faqat shu urinishlar bo'yicha sanaladi. Prisma'ning `_count` (where bilan) butun javoblar
   * jadvalini guruhlaydi: o'quvchi ko'paygan sari hamma uchun sekinlashardi.
   */
  private async activity(userId: string, since: Date): Promise<{ day: string; answers: number }[]> {
    const where = SUBMITTED_SINCE(userId, since);
    const [topic, weekly, mock] = await Promise.all([
      this.prisma.topicAttempt.findMany({ where, select: ACTIVITY }),
      this.prisma.weeklyAttempt.findMany({ where, select: ACTIVITY }),
      this.prisma.mockAttempt.findMany({ where, select: ACTIVITY }),
    ]);
    const _count = { _all: true } as const;
    const [t, w, m] = await Promise.all([
      this.prisma.topicAnswer.groupBy({
        by: ["attemptId"],
        where: { attemptId: ids(topic), ...ANSWERED },
        _count,
      }),
      this.prisma.weeklyAnswer.groupBy({
        by: ["attemptId"],
        where: { attemptId: ids(weekly), ...ANSWERED },
        _count,
      }),
      this.prisma.mockAnswer.groupBy({
        by: ["attemptId"],
        where: { attemptId: ids(mock), ...ANSWERED },
        _count,
      }),
    ]);
    const n = countMap([...t, ...w, ...m], "attemptId");
    return [...topic, ...weekly, ...mock].map((r) => ({
      day: dayKey(r.submittedAt ?? since),
      answers: n.get(r.id) ?? 0,
    }));
  }

  private async availableTopics(): Promise<Set<string>> {
    const rows = await this.prisma.topic.findMany({
      where: { course: { isPublished: true }, questions: { some: { isPublished: true } } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  private async answers(userId: string): Promise<MyProgress["answers"]> {
    const attempt = { userId, submittedAt: { not: null } };
    const [checked, correct] = await Promise.all([
      this.prisma.topicAnswer.count({ where: { attempt, result: { in: ["CORRECT", "WRONG"] } } }),
      this.prisma.topicAnswer.count({ where: { attempt, result: "CORRECT" } }),
    ]);
    return { checked, correct };
  }

  /** Oxirgi 30 kun: sababli kunlar hisobga kirmaydi, kechikkan "keldi" */
  private async attendance(userId: string, now: Date): Promise<MyProgress["attendance"]> {
    const from = new Date(tashkentDayStart(now).getTime() - 30 * DAY_MS + 5 * 60 * 60_000);
    const rows = await this.prisma.attendance.groupBy({
      by: ["status"],
      where: { userId, date: { gte: new Date(dayKey(from)) }, status: { not: "EXCUSED" } },
      _count: { _all: true },
    });
    const total = rows.reduce((s, r) => s + r._count._all, 0);
    if (total === 0) return null;
    const present = rows
      .filter((r) => r.status === "PRESENT" || r.status === "LATE")
      .reduce((s, r) => s + r._count._all, 0);
    return { present, total };
  }
}
