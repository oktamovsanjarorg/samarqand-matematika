import type { Response01 } from "@samarqand/math";
import { MILLIY_PRESET } from "@samarqand/shared";
import { describe, expect, it } from "vitest";
import { scoreMock } from "../src/mock/mock-scoring";

const row = (k: number, n = 10): Response01[] => Array.from({ length: n }, (_, j) => (j < k ? 1 : 0));

describe("mock shkala balli (T-053)", () => {
  it("BR-M05: topshirgan 30 dan kam bo'lsa taxminiy: xom ball ulushi × shkala", () => {
    const s = scoreMock(MILLIY_PRESET, [{ id: "a", raw: 50.25, row: row(5) }]);
    expect(s).toMatchObject({ raschN: null, b: null });
    expect(s.scaled.get("a")).toBe(37.5);
  });

  it("BR-M05: 30 va undan ko'p bo'lsa Rasch: qiyin savolni yechgan yuqori, ko'p yechgan yuqori", () => {
    // Savollar qiyinligi bo'yicha: j-savolni k > j yechganlar yechadi (Guttman shkalasi + shovqin)
    const attempts = Array.from({ length: 40 }, (_, n) => {
      const k = n % 11;
      const r = row(k);
      if (n % 7 === 0 && k > 0 && k < 10) [r[k - 1], r[k]] = [0, 1];
      return { id: `p${n}`, raw: k, row: r };
    });
    attempts.push({ id: "hard", raw: 2, row: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1] });
    attempts.push({ id: "easy", raw: 2, row: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0] });
    const s = scoreMock(MILLIY_PRESET, attempts);
    expect(s.raschN).toBe(42);
    expect(s.b?.[9]).toBeGreaterThan(s.b?.[0] ?? 0);
    expect(s.scaled.get("hard")).toBeGreaterThan(s.scaled.get("easy") ?? 0);
    expect(s.scaled.get("p10")).toBeGreaterThan(s.scaled.get("p5") ?? 0);
    const all = [...s.scaled.values()];
    expect(Math.min(...all)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...all)).toBeLessThanOrEqual(75);
  });
});
