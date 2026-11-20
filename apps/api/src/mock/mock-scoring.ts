import {
  abilityScore,
  calibrate,
  difficultyWeights,
  RASCH_MIN_SAMPLE,
  type Response01,
} from "@samarqand/math";
import { approxScaled, examMaxRaw, type ExamTemplateInput } from "@samarqand/shared";

export interface ScoredAttempt {
  id: string;
  raw: number;
  /** Savollar tartibida: to'g'ri = 1 */
  row: Response01[];
}

export interface MockScores {
  /** Rasch ishlatilgan bo'lsa topshirganlar soni, aks holda null (taxminiy) */
  raschN: number | null;
  /** Savol qiyinliklari (savollar tartibida); taxminiyda null */
  b: number[] | null;
  scaled: Map<string, number>;
}

/**
 * Yopilishdagi shkala balli (BR-M05): topshirganlar yetarli bo'lsa Rasch (savol qiyinligi og'irligi bilan
 * mutlaq ball), aks holda xom ball ulushi × shkala
 */
export function scoreMock(t: ExamTemplateInput, attempts: ScoredAttempt[]): MockScores {
  if (attempts.length < RASCH_MIN_SAMPLE) {
    const max = examMaxRaw(t.sections);
    return {
      raschN: null,
      b: null,
      scaled: new Map(attempts.map((a) => [a.id, approxScaled(a.raw, max, t.scaleMax)])),
    };
  }
  const b = calibrate(attempts.map((a) => a.row));
  const w = difficultyWeights(b);
  return {
    raschN: attempts.length,
    b,
    scaled: new Map(attempts.map((a) => [a.id, abilityScore(a.row, w, t.scaleMax)])),
  };
}
