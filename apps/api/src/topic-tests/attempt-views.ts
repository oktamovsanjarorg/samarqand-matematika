import type { Question } from "@samarqand/db";
import type { AttemptResult, AttemptView, CheckResult } from "@samarqand/shared";
import { toDetail, toView } from "../questions/codec";

export interface AttemptRow {
  id: string;
  topicId: string;
  startedAt: Date;
  submittedAt: Date | null;
  correct: number | null;
  topic: { title: string };
  answers: { response: unknown; result: CheckResult | null; question: Question }[];
}

/** Urinishni o'qish uchun: savollar tartib bo'yicha, savol yozuvi bilan */
export const ATTEMPT_INCLUDE = {
  topic: { select: { title: true } },
  answers: { orderBy: { order: "asc" }, include: { question: true } },
} as const;

/** Ochiq urinish: faqat ko'rinadigan qism, javob va yechim yo'q (BR-Q01) */
export function openView(a: AttemptRow): AttemptView {
  return {
    status: "OPEN",
    id: a.id,
    topicId: a.topicId,
    topicTitle: a.topic.title,
    startedAt: a.startedAt.toISOString(),
    questions: a.answers.map((x) => ({ question: toView(x.question), response: x.response })),
  };
}

type AnswerRow = AttemptRow["answers"][number];

/** Natija qatorlari: to'g'ri javob va namunaviy yechim bilan (mavzu va haftalik test uchun umumiy) */
export function resultItems(answers: AnswerRow[]): AttemptResult["items"] {
  return answers.map((x) => {
    const detail = toDetail(x.question);
    return {
      question: toView(x.question),
      response: x.response,
      result: x.result ?? "MANUAL",
      answer: "answer" in detail ? detail.answer : null,
      solution: detail.solution ?? "",
    };
  });
}

/** Topshirilgan urinish: to'g'ri javob va namunaviy yechim bilan */
export function resultView(a: AttemptRow): AttemptResult {
  const items = resultItems(a.answers);
  return {
    status: "SUBMITTED",
    id: a.id,
    topicId: a.topicId,
    topicTitle: a.topic.title,
    startedAt: a.startedAt.toISOString(),
    submittedAt: (a.submittedAt ?? a.startedAt).toISOString(),
    correct: a.correct ?? 0,
    checkable: items.filter((i) => i.result !== "MANUAL").length,
    total: items.length,
    items,
  };
}
