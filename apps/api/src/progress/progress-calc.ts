import { BADGES, MASTERY_PERCENT, type BadgeKey, type MyProgress } from "@samarqand/shared";

const DAY_MS = 24 * 60 * 60_000;
const TASHKENT_MS = 5 * 60 * 60_000;

/** Toshkent kuni: "YYYY-MM-DD" */
export const dayKey = (d: Date) => new Date(d.getTime() + TASHKENT_MS).toISOString().slice(0, 10);

const shift = (key: string, days: number) =>
  new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Ketma-ket kunlar: bugundan (bugun faol bo'lmasa kechadan) orqaga; eng uzun seriya */
export function streakOf(days: Set<string>, now: Date): MyProgress["streak"] {
  const today = dayKey(now);
  const activeToday = days.has(today);
  let current = 0;
  for (let k = activeToday ? today : shift(today, -1); days.has(k); k = shift(k, -1)) current++;
  let best = 0;
  for (const d of days) {
    if (days.has(shift(d, -1))) continue; // seriya boshi emas
    let n = 0;
    for (let k = d; days.has(k); k = shift(k, 1)) n++;
    best = Math.max(best, n);
  }
  return { current, best, activeToday };
}

/** Oxirgi 7 kun bo'yicha javoblar soni, eskisidan bugungacha */
export function weekOf(answerDays: string[], now: Date): MyProgress["week"] {
  const today = dayKey(now);
  const counts = new Map<string, number>();
  for (const d of answerDays) counts.set(d, (counts.get(d) ?? 0) + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const date = shift(today, i - 6);
    return { date, answers: counts.get(date) ?? 0 };
  });
}

export const masteredCount = (best: (number | null)[]) =>
  best.filter((p) => p !== null && p >= MASTERY_PERCENT).length;

export interface BadgeInput {
  tests: number;
  answers: number;
  bestStreak: number;
  mastered: number;
  bestWeeklyPlace: number | null;
}

export function badgesOf(x: BadgeInput): MyProgress["badges"] {
  const done: Record<BadgeKey, boolean> = {
    "first-test": x.tests >= 1,
    "tests-10": x.tests >= 10,
    "answers-100": x.answers >= 100,
    "streak-7": x.bestStreak >= 7,
    "mastered-1": x.mastered >= 1,
    "weekly-top3": x.bestWeeklyPlace !== null && x.bestWeeklyPlace <= 3,
  };
  return (Object.keys(BADGES) as BadgeKey[]).map((key) => ({ key, done: done[key] }));
}
