import { describe, expect, it } from "vitest";
import { abilityScore, calibrate, difficultyWeights, estimateTheta, type Response01 } from "./rasch";

/** Ma'lum qiyinlik va qobiliyatlardan simulyatsiya: model ularni qayta tiklay olishi kerak */
function simulate(thetas: number[], bs: number[], seed = 7): Response01[][] {
  let x = seed;
  const rnd = () => (x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  return thetas.map((t) => bs.map((b) => (rnd() < 1 / (1 + Math.exp(-(t - b))) ? 1 : 0)));
}

function correlation(a: number[], b: number[]) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let cov = 0;
  let va = 0;
  let vb = 0;
  a.forEach((x, i) => {
    const y = b[i] ?? 0;
    cov += (x - ma) * (y - mb);
    va += (x - ma) ** 2;
    vb += (y - mb) ** 2;
  });
  return cov / Math.sqrt(va * vb);
}

describe("Rasch modeli (T-053)", () => {
  it("qobiliyat: ko'p yechgan yuqori; chekka natijalar chekli", () => {
    const b = [-2, -1, 0, 1, 2];
    expect(estimateTheta([1, 1, 1, 1, 0], b)).toBeGreaterThan(estimateTheta([1, 1, 1, 0, 0], b));
    expect(estimateTheta([0, 0, 0, 0, 0], b)).toBeLessThan(-2);
    expect(estimateTheta([1, 1, 1, 1, 1], b)).toBeGreaterThan(2);
  });

  it("JMLE simulyatsiyadagi savol qiyinliklarini tiklaydi", () => {
    const trueB = Array.from({ length: 30 }, (_, i) => -2 + (4 * i) / 29);
    const thetas = Array.from({ length: 400 }, (_, i) => -2.5 + (5 * i) / 399);
    const b = calibrate(simulate(thetas, trueB));
    expect(correlation(b, trueB)).toBeGreaterThan(0.97);
    b.forEach((x, i) => expect(Math.abs(x - (trueB[i] ?? 0))).toBeLessThan(0.6));
  });

  it("hamma yechgan savol eng oson, hech kim yechmagan eng qiyin", () => {
    const m: Response01[][] = [
      [1, 1, 0, 0],
      [1, 0, 1, 0],
      [1, 1, 1, 0],
      [1, 0, 0, 0],
    ];
    const b = calibrate(m);
    expect(Math.min(...b)).toBe(b[0]);
    expect(Math.max(...b)).toBe(b[3]);
  });

  it("BR-M02: mutlaq ball guruhga bog'liq emas; teng savollarda C ≈ 43%, A+ ≈ 81%", () => {
    const w = new Array<number>(40).fill(1);
    const share = (k: number) =>
      abilityScore(
        Array.from({ length: 40 }, (_, j) => (j < k ? 1 : 0)),
        w,
      );
    expect(share(17)).toBeGreaterThanOrEqual(44.5);
    expect(share(17)).toBeLessThan(50);
    expect(share(32)).toBeLessThan(70);
    expect(share(33)).toBeGreaterThanOrEqual(70);
    expect(share(40)).toBe(75);
    expect(share(0)).toBe(0);
    // Boshqa shkala mutanosib
    expect(abilityScore(new Array<Response01>(40).fill(1), w, 100)).toBe(100);
  });

  it("qiyin savolni yechgan teng to'g'ri sonda yuqori turadi", () => {
    const w = difficultyWeights([-2, -1, 0, 1, 2]);
    expect(w[4]).toBeGreaterThan(w[0] ?? 0);
    expect(abilityScore([0, 0, 0, 1, 1], w)).toBeGreaterThan(abilityScore([1, 1, 0, 0, 0], w));
  });
});
