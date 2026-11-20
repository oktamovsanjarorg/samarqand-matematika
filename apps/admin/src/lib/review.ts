import type { ReviewItem, ReviewQueue, SolutionVerdictKind } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export const VERDICT_LABELS: Record<SolutionVerdictKind, string> = {
  SOLVED_CORRECTLY: "Toʻgʻri yechilgan",
  RIGHT_ANSWER_WRONG_METHOD: "Javob toʻgʻri, yechimda xato",
  INCOMPLETE: "Yechim tugallanmagan",
  WRONG: "Notoʻgʻri",
  SUSPECTED_COPY: "Koʻchirishga shubha",
  UNREADABLE: "Oʻqib boʻlmadi",
  NO_SOLUTION: "Yechim yoʻq",
};

export const SIGNAL_LABELS: Record<string, string> = {
  ANSWER_NOT_DERIVED: "Javob yechimdan kelib chiqmaydi",
  SKIPPED_STEPS: "Oraliq qadamlar yoʻq",
  CHATBOT_STYLE: "AI chatbot uslubi",
  ABOVE_LEVEL_METHOD: "Darajadan yuqori usul",
};

export type ReviewFilter = "ALL" | "TODO" | "FLAGGED";

/** Shubhali yoki server signali bor (navbatda birinchi turadi) */
export const isFlagged = (i: ReviewItem) =>
  !!i.ai?.suspected || i.signals.sameWrong > 0 || i.signals.historyJump;

export function filterItems(items: ReviewItem[], f: ReviewFilter): ReviewItem[] {
  if (f === "TODO") return items.filter((i) => !i.decision);
  if (f === "FLAGGED") return items.filter(isFlagged);
  return items;
}

export const useReview = (id: string) =>
  useQuery({ queryKey: ["review", id], queryFn: () => api.get<ReviewQueue>(`/admin/weekly/${id}/review`) });

export function useGrade(testId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { item: ReviewItem; points: 0 | 1; note: string }) =>
      api.put(`/admin/weekly/attempts/${p.item.attemptId}/answers/${p.item.questionId}/grade`, {
        points: p.points,
        ...(p.note.trim() ? { note: p.note.trim() } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["review", testId] });
      void qc.invalidateQueries({ queryKey: ["standings", testId] });
    },
  });
}
