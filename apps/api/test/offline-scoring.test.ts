import { MILLIY_PRESET } from "@samarqand/shared";
import { describe, expect, it } from "vitest";
import { scoreOffline } from "../src/offline/offline-scoring";

const T = { scaleMax: MILLIY_PRESET.scaleMax, grades: MILLIY_PRESET.grades };

describe("scoreOffline (T-180, BR-G04, BR-M05)", () => {
  it("kam qatnashchida savollar teng; ko'proq to'g'ri — yuqori ball, 0..75", () => {
    const { rasch, rows } = scoreOffline(["cwcb", "cccc", "wwbb"], T);
    expect(rasch).toMatchObject({ calibrated: false, n: 3 });
    expect(rasch.items.every((i) => i.w === 1 && i.b === 0)).toBe(true);
    expect(rasch.items[0]).toMatchObject({ q: 1, correctPct: 66.7 });
    expect(rows[0]).toMatchObject({ correct: 2, wrong: 1, blank: 1, percent: 50 });
    expect(rows[1]!.score).toBeGreaterThan(rows[0]!.score);
    expect(rows[0]!.score).toBeGreaterThan(rows[2]!.score);
    for (const r of rows) expect(r.score).toBeGreaterThanOrEqual(0);
    expect(rows[1]!.score).toBeLessThanOrEqual(75);
  });

  it("daraja shablon chegarasidan; past ballda daraja yo'q", () => {
    const { rows } = scoreOffline(["c".repeat(40), "w".repeat(40)], T);
    expect(rows[0]!.grade).toBe("A+");
    expect(rows[1]!.grade).toBeNull();
  });

  it("30+ qatnashchida kalibrlanadi: kam yechilgan savol qiyinroq va og'irroq", () => {
    const answers = Array.from({ length: 40 }, (_, i) => `c${i % 4 === 0 ? "c" : "w"}${i % 2 ? "c" : "w"}`);
    const { rasch } = scoreOffline(answers, T);
    expect(rasch.calibrated).toBe(true);
    const [easy, hard] = [rasch.items[0]!, rasch.items[1]!];
    expect(hard.b).toBeGreaterThan(easy.b);
    expect(hard.w).toBeGreaterThan(easy.w);
  });
});
