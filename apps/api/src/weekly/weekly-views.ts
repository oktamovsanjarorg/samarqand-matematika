import type { CheckResult, WeeklyAttemptView } from "@samarqand/shared";
import { toView } from "../questions/codec";
import { resultItems, type AttemptRow } from "../topic-tests/attempt-views";

export interface WeeklyAttemptRow {
  id: string;
  weeklyTestId: string;
  startedAt: Date;
  submittedAt: Date | null;
  correct: number | null;
  score: number | null;
  weeklyTest: { title: string; closesAt: Date };
  answers: (AttemptRow["answers"][number] & { photos: { id: string }[] })[];
}

export const WEEKLY_ATTEMPT_INCLUDE = {
  weeklyTest: { select: { title: true, closesAt: true } },
  answers: {
    orderBy: { order: "asc" },
    include: { question: true, photos: { select: { id: true }, orderBy: { createdAt: "asc" } } },
  },
} as const;

/** BR-W04: yechim rasmisiz to'g'ri javob hisoblanmaydi (0) */
export const withPhotoRule = (result: CheckResult, photos: number): CheckResult =>
  result === "CORRECT" && photos === 0 ? "WRONG" : result;

const ids = (photos: { id: string }[]) => photos.map((p) => p.id);

/** Ball: yopilishda qo'yilgan bo'lsa shu; aks holda topshirgan bo'lsa to'g'rilar soni, topshirmagan bo'lsa 0 (BR-W03) */
export const scoreOf = (a: Pick<WeeklyAttemptRow, "score" | "submittedAt" | "correct">) =>
  a.score ?? (a.submittedAt ? (a.correct ?? 0) : 0);

/**
 * Urinish ko'rinishi vaqtga bog'liq (BR-W08): oyna ochiq va topshirilmagan — savollar;
 * topshirilgan, oyna ochiq — faqat "kuting"; oyna yopilgan — natija va to'g'ri javoblar.
 */
export function weeklyView(a: WeeklyAttemptRow, now: Date): WeeklyAttemptView {
  const base = { id: a.id, weeklyTestId: a.weeklyTestId, title: a.weeklyTest.title };
  if (now >= a.weeklyTest.closesAt) {
    // Topshirilmagan test: javob belgilangan bo'lsa ham hammasi 0 (BR-W03)
    const items = resultItems(a.answers).map((i, n) => {
      const photos = ids(a.answers[n]?.photos ?? []);
      return {
        ...i,
        result: a.submittedAt ? i.result : ("WRONG" as const),
        photos,
        noPhoto: photos.length === 0,
      };
    });
    return {
      ...base,
      status: "RESULT",
      startedAt: a.startedAt.toISOString(),
      submittedAt: a.submittedAt?.toISOString() ?? null,
      correct: a.submittedAt ? (a.correct ?? 0) : 0,
      checkable: items.filter((i) => i.result !== "MANUAL").length,
      total: items.length,
      score: scoreOf(a),
      items,
    };
  }
  if (a.submittedAt)
    return {
      status: "WAITING",
      id: a.id,
      title: a.weeklyTest.title,
      submittedAt: a.submittedAt.toISOString(),
      closesAt: a.weeklyTest.closesAt.toISOString(),
    };
  return {
    ...base,
    status: "OPEN",
    startedAt: a.startedAt.toISOString(),
    closesAt: a.weeklyTest.closesAt.toISOString(),
    questions: a.answers.map((x) => ({
      question: toView(x.question),
      response: x.response,
      photos: ids(x.photos),
    })),
  };
}
