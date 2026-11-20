import { z } from "zod";

/** AI hukmi (PLAN §6): taklif xolos, yakuniy ballni ustoz qo'yadi (BR-W06) */
export const SOLUTION_VERDICTS = [
  "SOLVED_CORRECTLY",
  "RIGHT_ANSWER_WRONG_METHOD",
  "INCOMPLETE",
  "WRONG",
  "SUSPECTED_COPY",
  "UNREADABLE",
  "NO_SOLUTION",
] as const;
export type SolutionVerdictKind = (typeof SOLUTION_VERDICTS)[number];

/** Ko'chirish belgilari: bittasi ayblov emas, ustoz navbatida birinchi turish uchun (BR-W05) */
export const COPY_SIGNALS = [
  "ANSWER_NOT_DERIVED",
  "SKIPPED_STEPS",
  "CHATBOT_STYLE",
  "ABOVE_LEVEL_METHOD",
] as const;

/**
 * Model qaytaradigan tuzilgan javob. Sxema structured outputs bilan majburlanadi,
 * shuning uchun faqat enum, string, boolean va massiv (raqam chegaralarisiz).
 */
export const solutionVerdict = z.object({
  verdict: z.enum(SOLUTION_VERDICTS),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  /** O'quvchi belgilagan javob yechimdan haqiqatan kelib chiqadimi */
  answerFollows: z.boolean(),
  steps: z.array(z.object({ text: z.string(), ok: z.boolean(), note: z.string() })),
  copySignals: z.array(z.enum(COPY_SIGNALS)),
  /** Ustoz uchun qisqa izoh (o'zbek lotinida) */
  teacherNote: z.string(),
  /** O'quvchiga oyna yopilgach ko'rsatiladi: xato qayerda. Ko'chirish haqida hech narsa demaydi (BR-W05) */
  studentFeedback: z.string(),
});
export type SolutionVerdict = z.infer<typeof solutionVerdict>;

/** Ustoz navbatida birinchi turadi: AI aniq shubha desa yoki kamida ikki belgi bo'lsa (BR-W05) */
export const isSuspected = (v: SolutionVerdict) =>
  v.verdict === "SUSPECTED_COPY" || v.copySignals.length >= 2;
