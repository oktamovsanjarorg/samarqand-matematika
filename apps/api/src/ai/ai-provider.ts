import type { SolutionVerdict } from "@samarqand/shared";

export interface SolutionPhotoInput {
  type: "image/jpeg" | "image/png" | "image/webp";
  data: Buffer;
}

/** Bitta savol bo'yicha tekshiruv: etalon (namunaviy yechim, to'g'ri javob) va o'quvchi rasmlari */
export interface SolutionCheckInput {
  question: string;
  modelSolution: string;
  correctAnswer: string | null;
  studentAnswer: string | null;
  photos: SolutionPhotoInput[];
}

/**
 * AI provayderi (ADR-0004). null: AI o'chiq yoki hukm berolmadi — oqim baribir ishlaydi,
 * savol ustoz navbatiga AI hukmisiz tushadi (BR-W06).
 */
export interface AiProvider {
  readonly name: string;
  checkSolution(input: SolutionCheckInput): Promise<SolutionVerdict | null>;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");

/** AI_PROVIDER=off */
export class DisabledAiProvider implements AiProvider {
  readonly name = "off";
  checkSolution(): Promise<null> {
    return Promise.resolve(null);
  }
}
