import { z } from "zod";
import type { CheckResult, QuestionInput, QuestionView } from "./question";

export type QuestionAnswer = Extract<QuestionInput, { answer: unknown }>["answer"];

/** Javobni saqlash: shakli savol turiga qarab serverda tekshiriladi (responseSchemas) */
export const saveAnswerBody = z.object({ response: z.unknown() });
export type SaveAnswerBody = z.infer<typeof saveAnswerBody>;

/** Ishlanayotgan test: to'g'ri javoblar yo'q (BR-Q01) */
export interface AttemptView {
  status: "OPEN";
  id: string;
  topicId: string;
  topicTitle: string;
  startedAt: string;
  /** Faqat xato qilingan savollar bilan qayta ishlash (T-104) */
  mistakesOnly: boolean;
  questions: { question: QuestionView; response: unknown }[];
}

/** Mavzu testini boshlash: mistakes bo'lsa faqat xato qilingan savollar (T-104) */
export const topicAttemptStart = z.object({ mistakes: z.boolean().optional() });

/** Topshirilgandan keyingi natija: endi to'g'ri javob va namunaviy yechim ko'rsatiladi */
export interface AttemptResult {
  status: "SUBMITTED";
  id: string;
  topicId: string;
  topicTitle: string;
  startedAt: string;
  submittedAt: string;
  correct: number;
  /** Avtomatik tekshiriladigan savollar soni */
  checkable: number;
  total: number;
  items: {
    question: QuestionView;
    response: unknown;
    result: CheckResult;
    /** To'g'ri javob. WRITTEN uchun null */
    answer: QuestionAnswer | null;
    solution: string;
  }[];
}
