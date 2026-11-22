import { describe, expect, it } from "vitest";
import {
  attendanceOf,
  currentMonth,
  monthRange,
  topOf,
  weekIndex,
  weekStarts,
} from "../src/stats/stats-calc";

describe("Oy statistikasi hisobi (T-162)", () => {
  it("oy chegarasi Toshkent vaqti bo'yicha: 1-kun 00:00 = UTC 19:00 oldingi kun; dekabr → yanvar", () => {
    expect(monthRange("2026-11")).toEqual({
      from: new Date("2026-10-31T19:00:00Z"),
      to: new Date("2026-11-30T19:00:00Z"),
    });
    expect(monthRange("2026-12").to.toISOString()).toBe("2026-12-31T19:00:00.000Z");
    // UTC'da hali 30-noyabr, Toshkentda 1-dekabr
    expect(currentMonth(new Date("2026-11-30T19:30:00Z"))).toBe("2026-12");
    expect(currentMonth(new Date("2026-11-30T18:59:00Z"))).toBe("2026-11");
  });

  it("haftalar dushanbadan (Toshkent), 8 ta, eskidan yangiga; chegaradagi vaqt to'g'ri haftaga tushadi", () => {
    // 2026-11-22 yakshanba, Toshkentda 12:00
    const s = weekStarts(new Date("2026-11-22T07:00:00Z"));
    expect(s).toHaveLength(8);
    expect(s[7]?.toISOString()).toBe("2026-11-15T19:00:00.000Z"); // 16-noyabr dushanba 00:00
    expect(s[0]?.toISOString()).toBe("2026-09-27T19:00:00.000Z");
    // Dushanba 00:00 Toshkent: yangi hafta
    const monday = weekStarts(new Date("2026-11-22T19:00:00Z"));
    expect(monday[7]?.toISOString()).toBe("2026-11-22T19:00:00.000Z");
    expect(weekIndex(s, new Date("2026-11-15T19:00:00Z"))).toBe(7);
    expect(weekIndex(s, new Date("2026-11-15T18:59:59Z"))).toBe(6);
    expect(weekIndex(s, new Date("2026-09-27T18:59:59Z"))).toBe(-1);
    expect(weekIndex(s, new Date("2026-11-22T19:00:00Z"))).toBe(-1);
  });

  it("davomat: keldi+kechikdi / hammasi; sababli kelmagan maxrajda; guruhlar eng pastidan", () => {
    const d1 = new Date("2026-11-02");
    const d2 = new Date("2026-11-04");
    const a = attendanceOf(
      [
        { groupId: "g1", date: d1, status: "PRESENT" },
        { groupId: "g1", date: d1, status: "LATE" },
        { groupId: "g1", date: d2, status: "ABSENT" },
        { groupId: "g1", date: d2, status: "EXCUSED" },
        { groupId: "g2", date: d1, status: "PRESENT" },
      ],
      new Map([
        ["g1", "7-A"],
        ["g2", "8-B"],
      ]),
    );
    expect(a).toEqual({
      rate: 60,
      marks: 5,
      absent: 1,
      byGroup: [
        { groupId: "g1", name: "7-A", days: 2, rate: 50, absent: 1 },
        { groupId: "g2", name: "8-B", days: 1, rate: 100, absent: 0 },
      ],
    });
    expect(attendanceOf([], new Map())).toEqual({ rate: null, marks: 0, absent: 0, byGroup: [] });
  });

  it("eng yaxshilar: kamida min javob; foiz bo'yicha, teng bo'lsa javobi ko'p birinchi; 5 tadan ko'p emas", () => {
    const rows = (userId: string, ok: number, all: number) =>
      Array.from({ length: all }, (_, i) => ({ userId, correct: i < ok }));
    const r = topOf(
      [...rows("a", 9, 10), ...rows("b", 18, 20), ...rows("c", 10, 10), ...rows("d", 9, 9)],
      10,
    );
    expect(r).toEqual([
      { userId: "c", percent: 100, answers: 10 },
      { userId: "b", percent: 90, answers: 20 },
      { userId: "a", percent: 90, answers: 10 },
    ]);
    const many = ["a", "b", "c", "d", "e", "f"].flatMap((u) => rows(u, 1, 1));
    expect(topOf(many, 1)).toHaveLength(5);
  });
});
