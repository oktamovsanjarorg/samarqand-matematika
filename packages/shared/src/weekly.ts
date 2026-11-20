import { z } from "zod";
import type { AttemptResult, AttemptView } from "./attempt";
import type { QuestionType } from "./question";

export type WeeklyStatus = "UPCOMING" | "OPEN" | "CLOSED";

/** BR-W01: oyna holati faqat vaqtdan aniqlanadi (cron'ga bog'liq emas) */
export function weeklyStatus(now: Date, opensAt: Date, closesAt: Date): WeeklyStatus {
  if (now < opensAt) return "UPCOMING";
  return now < closesAt ? "OPEN" : "CLOSED";
}

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Keyingi hafta oynasi: dushanba 00:00 dan yakshanba 23:59 gacha, Asia/Tashkent (UTC+5, yozgi vaqt yo'q) */
export function nextWeekWindow(now: Date): { opensAt: Date; closesAt: Date } {
  const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  const dow = (local.getUTCDay() + 6) % 7; // dushanba = 0
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const monday = midnight + (7 - dow) * DAY_MS - TASHKENT_OFFSET_MS;
  return { opensAt: new Date(monday), closesAt: new Date(monday + 7 * DAY_MS - 60_000) };
}

const iso = z.iso.datetime({ offset: true });

export const weeklyTestInput = z
  .object({
    title: z.string().trim().min(2, "Nom kamida 2 belgi").max(120),
    opensAt: iso,
    closesAt: iso,
    questionIds: z.array(z.string().min(1)).min(1, "Kamida 1 ta savol").max(60),
    isPublished: z.boolean().optional(),
  })
  .refine((v) => new Date(v.closesAt) > new Date(v.opensAt), {
    message: "Yopilish ochilishdan keyin boʻlsin",
    path: ["closesAt"],
  })
  .refine((v) => new Set(v.questionIds).size === v.questionIds.length, {
    message: "Savol takrorlangan",
    path: ["questionIds"],
  });
export type WeeklyTestInput = z.infer<typeof weeklyTestInput>;

/** O'quvchi ro'yxati: natija faqat oyna yopilgandan keyin (BR-W08) */
export interface StudentWeeklyRow {
  id: string;
  title: string;
  opensAt: string;
  closesAt: string;
  status: WeeklyStatus;
  questionCount: number;
  my: { started: boolean; submitted: boolean; score: number | null };
}

/** Topshirilgan, oyna hali ochiq: javoblar ham, natija ham ko'rsatilmaydi */
export interface WeeklyWaiting {
  status: "WAITING";
  id: string;
  title: string;
  submittedAt: string;
  closesAt: string;
}

/** Har savolga yechim rasmi: 1–3 ta (BR-W04) */
export const MAX_SOLUTION_PHOTOS = 3;

/** Ochiq urinish: savollar, saqlangan javoblar va yuklangan rasmlar (id) */
export type WeeklyOpen = Omit<AttemptView, "topicId" | "topicTitle" | "questions"> & {
  weeklyTestId: string;
  title: string;
  closesAt: string;
  questions: (AttemptView["questions"][number] & { photos: string[] })[];
};

export type WeeklyAttemptView = WeeklyOpen | WeeklyWaiting | WeeklyResult;

/** result: avtomatik tekshiruv; noPhoto: yechim rasmi yo'q, shuning uchun to'g'ri javob ham 0 ball (BR-W04) */
export type WeeklyResultItem = AttemptResult["items"][number] & {
  photos: string[];
  noPhoto: boolean;
  /** Shu savol uchun haqiqiy ball (ustoz qarori yoki avtomatik + rasm qoidasi) */
  points: number;
  /** Ustoz izohi yoki ustoz tasdiqlagan tushuntirish; bo'lmasa null */
  feedback: string | null;
};

/** Oyna yopilgandan keyin: ball va har savol bo'yicha to'g'ri javob */
export type WeeklyResult = Omit<
  AttemptResult,
  "status" | "topicId" | "topicTitle" | "submittedAt" | "items"
> & {
  items: WeeklyResultItem[];
  status: "RESULT";
  weeklyTestId: string;
  title: string;
  submittedAt: string | null;
  score: number;
};

export interface AdminWeeklyRow {
  id: string;
  title: string;
  opensAt: string;
  closesAt: string;
  isPublished: boolean;
  status: WeeklyStatus;
  questionCount: number;
  submitted: number;
}

export interface WeeklyQuestionRow {
  id: string;
  type: QuestionType;
  text: string;
  topicTitle: string;
}

export interface AdminWeeklyDetail extends AdminWeeklyRow {
  questionIds: string[];
  questions: WeeklyQuestionRow[];
}

/** Natijalar jadvali: ball bo'yicha, teng bo'lsa erta topshirgan yuqorida */
export interface WeeklyStanding {
  userId: string;
  name: string;
  submittedAt: string | null;
  correct: number;
  score: number;
}
