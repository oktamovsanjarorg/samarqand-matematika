import { z } from "zod";
import type { SolutionVerdict } from "./ai";
import type { CheckResult, QuestionView } from "./question";

export type AiReviewStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

/** Ustoz qarori (BR-W06): har savol 1 ball */
export const gradeInput = z.object({
  points: z.union([z.literal(0), z.literal(1)]),
  note: z.string().trim().max(1000).optional(),
});
export type GradeInput = z.infer<typeof gradeInput>;

/** AI tavsiyasi: faqat to'liq to'g'ri yechim ball oladi */
export const suggestedPoints = (v: SolutionVerdict): 0 | 1 => (v.verdict === "SOLVED_CORRECTLY" ? 1 : 0);

/** Ustoz navbatidagi bitta javob. AI va signallar faqat xodimga ko'rinadi (BR-W05) */
export interface ReviewItem {
  attemptId: string;
  questionId: string;
  order: number;
  student: { userId: string; name: string };
  question: QuestionView;
  response: unknown;
  correctAnswer: unknown;
  autoResult: CheckResult | null;
  /** Avtomatik ball (rasm qoidasi bilan, BR-W04) */
  autoPoints: number;
  photos: string[];
  ai: {
    status: AiReviewStatus;
    suspected: boolean;
    verdict: SolutionVerdict | null;
    suggested: 0 | 1 | null;
  } | null;
  signals: { sameWrong: number; historyJump: boolean };
  decision: { points: number; note: string | null; reviewedAt: string; reviewer: string } | null;
}

export interface ReviewQueue {
  testId: string;
  title: string;
  closesAt: string;
  items: ReviewItem[];
}
