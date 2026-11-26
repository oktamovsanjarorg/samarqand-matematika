import {
  abilityScore,
  calibrate,
  difficultyWeights,
  RASCH_MIN_SAMPLE,
  type Response01,
} from "@samarqand/math";
import { gradeOf, type ExamGrade, type OfflineRasch } from "@samarqand/shared";

export interface OfflineScore {
  correct: number;
  wrong: number;
  blank: number;
  percent: number;
  /** Shkala balli (Milliy sertifikat: 0..75) */
  score: number;
  grade: string | null;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r3 = (x: number) => Math.round(x * 1000) / 1000;

function counts(answers: string) {
  const marks = [...answers];
  const correct = marks.filter((x) => x === "c").length;
  const blank = marks.filter((x) => x === "b" || x === "-").length;
  return { correct, wrong: marks.length - correct - blank, blank };
}

/**
 * Offline test bahosi (T-180, BR-G04): mock bilan bir xil Rasch (BR-M05). Kamida RASCH_MIN_SAMPLE
 * qatnashchi bo'lsa savol qiyinliklari shu natijalardan hisoblanadi va qiyin savol og'irroq bo'ladi;
 * kam bo'lsa hamma savol teng (og'irlik 1). Shkala va darajalar faol imtihon shablonidan.
 */
export function scoreOffline(
  answers: string[],
  t: { scaleMax: number; grades: ExamGrade[] },
): { rasch: OfflineRasch; rows: OfflineScore[] } {
  const L = answers[0]?.length ?? 0;
  const matrix = answers.map((a) => [...a].map((x) => (x === "c" ? 1 : 0)) as Response01[]);
  const calibrated = answers.length >= RASCH_MIN_SAMPLE;
  const b = calibrated ? calibrate(matrix) : new Array<number>(L).fill(0);
  const w = calibrated ? difficultyWeights(b) : b.map(() => 1);
  const rows = answers.map((a, i) => {
    const c = counts(a);
    const score = abilityScore(matrix[i] ?? [], w, t.scaleMax);
    return { ...c, percent: L ? r1((c.correct / L) * 100) : 0, score, grade: gradeOf(score, t.grades) };
  });
  const n = answers.length || 1;
  const items = b.map((x, j) => ({
    q: j + 1,
    b: r3(x),
    w: r3(w[j] ?? 1),
    correctPct: r1((matrix.reduce((s, m) => s + (m[j] ?? 0), 0) / n) * 100),
  }));
  return { rasch: { calibrated, n: answers.length, items }, rows };
}
