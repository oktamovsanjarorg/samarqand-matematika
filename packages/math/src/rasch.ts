/**
 * Rasch (1PL) modeli: P(to'g'ri) = 1 / (1 + e^-(θ − b)); θ — qobiliyat, b — savol qiyinligi (logit).
 * Guruh faqat savol qiyinligini beradi; ball o'quvchining qiyinlik bilan og'irlangan ulushidan
 * (mutlaq T-ball, guruh o'rtachasiga bog'liq emas). Ona tili loyihasidan ko'chirilgan (ADR-0005).
 */

export type Response01 = 0 | 1;

const P = (theta: number, b: number) => 1 / (1 + Math.exp(-(theta - b)));
const clampStep = (x: number) => Math.max(-1, Math.min(1, x));
/** Hammasini yechgan yoki hech narsa yechmagan uchun cheksiz θ o'rniga xom ballni 0.3 ga siljitish */
const EXTREME_ADJ = 0.3;
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

/** Kalibrlash uchun kamida shuncha topshirgan kerak; kam bo'lsa natija taxminiy (BR-M05) */
export const RASCH_MIN_SAMPLE = 30;

const adjusted = (r: number, n: number) => (r === 0 ? EXTREME_ADJ : r === n ? n - EXTREME_ADJ : r);

/** Ma'lum savol qiyinliklari bo'yicha bitta o'quvchining qobiliyati (MLE, Nyuton usuli) */
export function estimateTheta(responses: Response01[], b: number[]): number {
  const L = responses.length;
  if (!L) return 0;
  const r = adjusted(sum(responses), L);
  let theta = Math.log(r / (L - r));
  for (let it = 0; it < 100; it++) {
    const ps = responses.map((_, i) => P(theta, b[i] ?? 0));
    const step = clampStep((r - sum(ps)) / Math.max(sum(ps.map((p) => p * (1 - p))), 1e-6));
    theta += step;
    if (Math.abs(step) < 1e-4) break;
  }
  return theta;
}

interface Fit {
  m: Response01[][];
  items: number[];
  persons: number[];
  theta: number[];
  b: number[];
}

const cell = (f: Fit, n: number, i: number) => f.m[n]?.[i] ?? 0;

/** JMLE bir qadami: avval qobiliyatlar, keyin qiyinliklar. Eng katta o'zgarishni qaytaradi */
function jmleStep(f: Fit): number {
  let maxChange = 0;
  for (const n of f.persons) {
    const ps = f.items.map((i) => P(f.theta[n] ?? 0, f.b[i] ?? 0));
    const r = adjusted(sum(f.items.map((i) => cell(f, n, i))), f.items.length);
    const step = clampStep((r - sum(ps)) / Math.max(sum(ps.map((p) => p * (1 - p))), 1e-6));
    f.theta[n] = (f.theta[n] ?? 0) + step;
    maxChange = Math.max(maxChange, Math.abs(step));
  }
  for (const i of f.items) {
    const ps = f.persons.map((n) => P(f.theta[n] ?? 0, f.b[i] ?? 0));
    const observed = sum(f.persons.map((n) => cell(f, n, i)));
    // Kutilgandan ko'p yechilgan savol osonroq (b kamayadi)
    const step = clampStep((observed - sum(ps)) / Math.max(sum(ps.map((p) => p * (1 - p))), 1e-6));
    f.b[i] = (f.b[i] ?? 0) - step;
    maxChange = Math.max(maxChange, Math.abs(step));
  }
  const mean = sum(f.items.map((i) => f.b[i] ?? 0)) / f.items.length;
  for (const i of f.items) f.b[i] = (f.b[i] ?? 0) - mean;
  return maxChange;
}

/**
 * Savol qiyinliklari (o'rtachasi 0). Hamma yechgan yoki hech kim yechmagan savollar va 0/maksimal ball
 * olganlar baholashda qatnashmaydi (MLE cheksiz), keyin chegaraviy qiymat oladi. Wright tuzatishi (L−1)/L.
 */
export function calibrate(m: Response01[][]): number[] {
  const N = m.length;
  const L = m[0]?.length ?? 0;
  if (!N || !L) return new Array<number>(L).fill(0);
  const itemScore = Array.from({ length: L }, (_, i) => sum(m.map((row) => row[i] ?? 0)));
  const personScore = m.map((row) => sum(row));
  const f: Fit = {
    m,
    items: [...Array(L).keys()].filter((i) => (itemScore[i] ?? 0) > 0 && (itemScore[i] ?? 0) < N),
    persons: [...Array(N).keys()].filter((n) => (personScore[n] ?? 0) > 0 && (personScore[n] ?? 0) < L),
    theta: personScore.map((r) => Math.log(Math.max(r, EXTREME_ADJ) / Math.max(L - r, EXTREME_ADJ))),
    b: itemScore.map((s) => (s > 0 && s < N ? Math.log((N - s) / s) : 0)),
  };
  if (f.items.length >= 2 && f.persons.length >= 2) {
    for (let it = 0; it < 300; it++) if (jmleStep(f) < 1e-3) break;
    const k = (f.items.length - 1) / f.items.length;
    for (const i of f.items) f.b[i] = (f.b[i] ?? 0) * k;
  }
  return withEdges(f, itemScore, N);
}

/** Hamma yechgan savol eng osondan ham oson, hech kim yechmagan eng qiyindan ham qiyin */
function withEdges(f: Fit, itemScore: number[], N: number): number[] {
  const known = f.items.map((i) => f.b[i] ?? 0);
  const lo = known.length ? Math.min(...known) : 0;
  const hi = known.length ? Math.max(...known) : 0;
  return f.b.map((x, i) => (itemScore[i] === N ? lo - 1 : itemScore[i] === 0 ? hi + 1 : x));
}

const DIFFICULTY_STRENGTH = 0.25;
const DIFFICULTY_Z_LIMIT = 2;
/** Teng savollarda C (46) ≈ 43%, A+ (70) ≈ 81% to'g'ri. Haqiqiy milliy natijalar bilan solishtirilmagan */
const ABILITY_SLOPE = 14;
/** Formula 75 ballik shkala uchun; boshqa shkalaga mutanosib o'tkaziladi */
const BASE_SCALE = 75;

/** Savol qiyinligidan og'irlik: oson savol ham bilim (≈1), qiyinroq biroz og'irroq */
export function difficultyWeights(b: number[]): number[] {
  const n = b.length;
  const mean = n ? sum(b) / n : 0;
  const sd = n > 1 ? Math.sqrt(sum(b.map((x) => (x - mean) ** 2)) / (n - 1)) : 0;
  return b.map((x) => {
    const z = sd > 1e-9 ? (x - mean) / sd : 0;
    return Math.exp(DIFFICULTY_STRENGTH * Math.max(-DIFFICULTY_Z_LIMIT, Math.min(DIFFICULTY_Z_LIMIT, z)));
  });
}

/** Mutlaq T-ball: T = 50 + 14·logit((Σ javob·og'irlik + 0.5) / (Σ og'irlik + 1)), 0..75, shkalaga o'tkaziladi */
export function abilityScore(responses: Response01[], weights: number[], scaleMax = BASE_SCALE): number {
  const total = sum(weights);
  const got = sum(responses.map((x, j) => x * (weights[j] ?? 1)));
  const p = (got + 0.5) / (total + 1);
  const t = Math.max(0, Math.min(BASE_SCALE, 50 + ABILITY_SLOPE * Math.log(p / (1 - p))));
  return Math.round(((t * scaleMax) / BASE_SCALE) * 10) / 10;
}
