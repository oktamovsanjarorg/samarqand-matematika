import { Injectable } from "@nestjs/common";
import { STATS_TOP_MIN_ANSWERS, type MonthStats } from "@samarqand/shared";
import { PERSON_SELECT, personName } from "../common/person";
import { RANKED } from "../common/ranked";
import { PrismaService } from "../prisma/prisma.service";
import { attendanceOf, monthRange, pct, topOf, weekIndex, weekStarts } from "./stats-calc";

type Range = { from: Date; to: Date };

/** Oy statistikasi (T-162): faqat o'quvchilar (xodim sinovlari kirmaydi), "faqat xatolar" qayta ishlash kirmaydi */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async month(month: string, now = new Date()): Promise<MonthStats> {
    const r = monthRange(month);
    const [students, answers, topicAttempts, weekly, attendance, weeks] = await Promise.all([
      this.students(r),
      this.answers(r),
      this.topicSubmitters(r),
      this.weekly(r),
      this.attendance(month),
      this.weeks(now),
    ]);
    const ok = answers.filter((a) => a.correct).length;
    const active = new Set([...topicAttempts, ...weekly.submitters]).size;
    return {
      month,
      students: { ...students, active },
      attendance,
      topicTests: { attempts: topicAttempts.length, correctPercent: pct(ok, answers.length) },
      weekly: weekly.summary,
      top: await this.named(topOf(answers, STATS_TOP_MIN_ANSWERS)),
      weeks,
    };
  }

  private async students(r: Range) {
    const [total, newThisMonth] = await Promise.all([
      this.prisma.user.count({ where: { role: "STUDENT" } }),
      this.prisma.studentProfile.count({ where: { ...RANKED, acceptedAt: { gte: r.from, lt: r.to } } }),
    ]);
    return { total, newThisMonth };
  }

  private async answers(r: Range) {
    const rows = await this.prisma.topicAnswer.findMany({
      where: {
        result: { in: ["CORRECT", "WRONG"] },
        attempt: { submittedAt: { gte: r.from, lt: r.to }, mistakesOnly: false, ...RANKED },
      },
      select: { result: true, attempt: { select: { userId: true } } },
      take: 100_000,
    });
    return rows.map((a) => ({ userId: a.attempt.userId, correct: a.result === "CORRECT" }));
  }

  /** Oyda topshirilgan mavzu testlari: har biri uchun o'quvchi id */
  private async topicSubmitters(r: Range) {
    const rows = await this.prisma.topicAttempt.findMany({
      where: { submittedAt: { gte: r.from, lt: r.to }, mistakesOnly: false, ...RANKED },
      select: { userId: true },
    });
    return rows.map((a) => a.userId);
  }

  /** Oyda yopilgan haftaliklar: o'rtacha ball foizi (topshirganlar bo'yicha, maksimal = savollar soni) */
  private async weekly(r: Range) {
    const tests = await this.prisma.weeklyTest.findMany({
      where: { isPublished: true, closesAt: { gte: r.from, lt: r.to } },
      select: {
        _count: { select: { questions: true } },
        attempts: { where: { submittedAt: { not: null }, ...RANKED }, select: { userId: true, score: true } },
      },
    });
    let got = 0;
    let max = 0;
    const submitters: string[] = [];
    for (const t of tests)
      for (const a of t.attempts) {
        submitters.push(a.userId);
        if (a.score === null) continue;
        got += a.score;
        max += t._count.questions;
      }
    return {
      submitters,
      summary: { tests: tests.length, submitted: submitters.length, avgPercent: pct(got, max) },
    };
  }

  /** Davomat sanasi @db.Date (soatsiz): oy chegarasi UTC sanada */
  private async attendance(month: string) {
    const [y = 0, m = 1] = month.split("-").map(Number);
    const [marks, groups] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { date: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) } },
        select: { groupId: true, date: true, status: true },
      }),
      this.prisma.group.findMany({ select: { id: true, name: true } }),
    ]);
    return attendanceOf(marks, new Map(groups.map((g) => [g.id, g.name])));
  }

  private async weeks(now: Date): Promise<MonthStats["weeks"]> {
    const starts = weekStarts(now);
    const since = { submittedAt: { gte: starts[0] }, ...RANKED };
    const [topic, weekly] = await Promise.all([
      this.prisma.topicAttempt.findMany({
        where: { ...since, mistakesOnly: false },
        select: { userId: true, submittedAt: true },
      }),
      this.prisma.weeklyAttempt.findMany({ where: since, select: { userId: true, submittedAt: true } }),
    ]);
    const out = starts.map((s) => ({
      start: s.toISOString(),
      topicTests: 0,
      weeklyTests: 0,
      users: new Set<string>(),
    }));
    const add = (a: { userId: string; submittedAt: Date | null }, k: "topicTests" | "weeklyTests") => {
      const w = a.submittedAt ? out[weekIndex(starts, a.submittedAt)] : undefined;
      if (!w) return;
      w[k]++;
      w.users.add(a.userId);
    };
    topic.forEach((a) => add(a, "topicTests"));
    weekly.forEach((a) => add(a, "weeklyTests"));
    return out.map(({ users, ...w }) => ({ ...w, activeStudents: users.size }));
  }

  private async named(top: { userId: string; percent: number; answers: number }[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: top.map((t) => t.userId) } },
      select: { id: true, ...PERSON_SELECT },
    });
    const names = new Map(users.map((u) => [u.id, personName(u)]));
    return top.map((t) => ({ ...t, name: names.get(t.userId) ?? "Oʻquvchi" }));
  }
}
