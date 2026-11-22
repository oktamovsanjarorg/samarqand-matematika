import type { SolutionVerdict, TutorMode } from "@samarqand/shared";

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

/** Yordamchi so'rovi: kontekstni server tuzadi (kliyent rejim qoidasini o'zgartira olmaydi) */
export interface TutorInput {
  mode: TutorMode;
  /** Savol, etalon, o'quvchi javobi va h.k. — tizim promptiga qo'shiladi */
  context: string;
  /** Oxirgisi o'quvchining yangi xabari */
  history: { role: "user" | "assistant"; text: string }[];
  /** Oxirgi xabarga biriktiriladigan rasmlar: REVIEW yechim rasmlari va o'quvchi yuborgan rasm (T-170) */
  photos: SolutionPhotoInput[];
}

/**
 * AI provayderi (ADR-0004). null: AI o'chiq yoki hukm berolmadi — oqim baribir ishlaydi,
 * savol ustoz navbatiga AI hukmisiz tushadi (BR-W06).
 */
export interface AiProvider {
  readonly name: string;
  checkSolution(input: SolutionCheckInput): Promise<SolutionVerdict | null>;
  /** null: AI o'chiq yoki javob bermadi */
  tutor(input: TutorInput): Promise<string | null>;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");

/** AI_PROVIDER=off */
export class DisabledAiProvider implements AiProvider {
  readonly name = "off";
  checkSolution(): Promise<null> {
    return Promise.resolve(null);
  }
  tutor(): Promise<null> {
    return Promise.resolve(null);
  }
}
