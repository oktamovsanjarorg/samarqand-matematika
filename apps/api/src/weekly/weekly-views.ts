import type { CheckResult, SolutionVerdict, WeeklyAttemptView } from "@samarqand/shared";
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
  answers: (AttemptRow["answers"][number] & {
    photos: { id: string }[];
    teacherPoints: number | null;
    teacherNote: string | null;
    aiReview: { status: string; verdict: unknown } | null;
  })[];
}

type AnswerRow = WeeklyAttemptRow["answers"][number];

export const WEEKLY_ATTEMPT_INCLUDE = {
  weeklyTest: { select: { title: true, closesAt: true } },
  answers: {
    orderBy: { order: "asc" },
    include: {
      question: true,
      photos: { select: { id: true }, orderBy: { createdAt: "asc" } },
      aiReview: { select: { status: true, verdict: true } },
    },
  },
} as const;

/** BR-W04: yechim rasmisiz to'g'ri javob hisoblanmaydi (0) */
export const withPhotoRule = (result: CheckResult, photos: number): CheckResult =>
  result === "CORRECT" && photos === 0 ? "WRONG" : result;

/** Ism: o'quvchi profilidagi to'liq ism, bo'lmasa Telegram ismi */
export const PERSON_SELECT = {
  firstName: true,
  lastName: true,
  student: { select: { fullName: true } },
} as const;
export const personName = (u: {
  firstName: string;
  lastName: string | null;
  student: { fullName: string | null } | null;
}) => u.student?.fullName ?? [u.firstName, u.lastName].filter(Boolean).join(" ");

const ids = (photos: { id: string }[]) => photos.map((p) => p.id);

/** Savol bali: ustoz qarori ustun, aks holda avtomatik tekshiruv va rasm qoidasi (BR-W04, W06) */
export const answerPoints = (x: {
  teacherPoints: number | null;
  result: CheckResult | null;
  photos: number;
}) => x.teacherPoints ?? (x.result && withPhotoRule(x.result, x.photos) === "CORRECT" ? 1 : 0);

/**
 * O'quvchiga tushuntirish faqat ustoz qaror qilgandan keyin: ustoz izohi, bo'lmasa AI'ning
 * o'quvchiga mo'ljallangan izohi (unda ko'chirish haqida gap yo'q, BR-W05)
 */
function feedbackOf(x: AnswerRow | undefined): string | null {
  if (!x || x.teacherPoints === null) return null;
  if (x.teacherNote) return x.teacherNote;
  const v = x.aiReview?.status === "DONE" ? (x.aiReview.verdict as SolutionVerdict | null) : null;
  return v?.studentFeedback.trim() || null;
}

/** Natijadagi savol holati: topshirilmagan — xato (BR-W03), ustoz qarori bo'lsa shu */
function itemResult(a: WeeklyAttemptRow, x: AnswerRow | undefined, auto: CheckResult): CheckResult {
  if (!a.submittedAt) return "WRONG";
  if (x && x.teacherPoints !== null) return x.teacherPoints > 0 ? "CORRECT" : "WRONG";
  return auto;
}

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
      const x = a.answers[n];
      const photos = ids(x?.photos ?? []);
      return {
        ...i,
        result: itemResult(a, x, i.result),
        photos,
        noPhoto: photos.length === 0,
        points: a.submittedAt
          ? answerPoints({ teacherPoints: x?.teacherPoints ?? null, result: i.result, photos: photos.length })
          : 0,
        feedback: feedbackOf(x),
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
