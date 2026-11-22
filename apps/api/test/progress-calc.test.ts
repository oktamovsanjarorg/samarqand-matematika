import { describe, expect, it } from "vitest";
import { badgesOf, dayKey, masteredCount, streakOf, weekOf } from "../src/progress/progress-calc";

/** Toshkent 2026-03-10 kuni soat 10:00 (UTC 05:00) */
const NOW = new Date("2026-03-10T05:00:00Z");

describe("O'quvchi yutuqlari hisobi (T-169, BR-R05)", () => {
  it("BR-R05: kun Toshkent vaqti bo'yicha: UTC 19:00 keyingi kunga o'tadi", () => {
    expect(dayKey(new Date("2026-03-09T18:59:00Z"))).toBe("2026-03-09");
    expect(dayKey(new Date("2026-03-09T19:00:00Z"))).toBe("2026-03-10");
  });

  it("BR-R05: seriya bugundan orqaga; bugun hali shug'ullanmagan bo'lsa kechadan sanaladi", () => {
    const days = new Set(["2026-03-10", "2026-03-09", "2026-03-08", "2026-03-05"]);
    expect(streakOf(days, NOW)).toEqual({ current: 3, best: 3, activeToday: true });
    days.delete("2026-03-10");
    expect(streakOf(days, NOW)).toEqual({ current: 2, best: 2, activeToday: false });
    days.delete("2026-03-09");
    // Kecha ham yo'q: seriya uzilgan, eng uzuni qoladi
    expect(streakOf(new Set(["2026-03-08", "2026-03-01", "2026-03-02", "2026-03-03"]), NOW)).toEqual({
      current: 0,
      best: 3,
      activeToday: false,
    });
    expect(streakOf(new Set(), NOW)).toEqual({ current: 0, best: 0, activeToday: false });
  });

  it("7 kun: eskisidan bugungacha, 7 kundan oldingisi kirmaydi", () => {
    const w = weekOf(["2026-03-10", "2026-03-10", "2026-03-04", "2026-03-03"], NOW);
    expect(w.map((d) => d.date)).toEqual([
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
    ]);
    expect(w.map((d) => d.answers)).toEqual([1, 0, 0, 0, 0, 0, 2]);
  });

  it("BR-R05: o'zlashtirilgan mavzu: eng yaxshi natija 80% va undan yuqori", () => {
    expect(masteredCount([80, 79, null, 100])).toBe(2);
  });

  it("nishonlar chegarada beriladi", () => {
    const none = badgesOf({ tests: 0, answers: 99, bestStreak: 6, mastered: 0, bestWeeklyPlace: 4 });
    expect(none.every((b) => !b.done)).toBe(true);
    const all = badgesOf({ tests: 10, answers: 100, bestStreak: 7, mastered: 1, bestWeeklyPlace: 3 });
    expect(all.every((b) => b.done)).toBe(true);
    expect(all.map((b) => b.key)).toEqual([
      "first-test",
      "tests-10",
      "answers-100",
      "streak-7",
      "mastered-1",
      "weekly-top3",
    ]);
    const nine = badgesOf({ tests: 9, answers: 0, bestStreak: 0, mastered: 0, bestWeeklyPlace: null });
    expect(nine.filter((b) => b.done).map((b) => b.key)).toEqual(["first-test"]);
  });
});
