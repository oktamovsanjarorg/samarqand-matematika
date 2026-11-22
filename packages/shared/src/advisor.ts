/**
 * Maslahatchi (T-161): butun sinf va platforma bo'yicha tavsiyalar. AI ishlatilmaydi:
 * har biri bazadagi aniq raqam («nega») va qilinadigan amal bilan. O'quvchi bo'yicha sabablar «E'tibor kerak» da (T-063).
 */
export type AdviceLevel = "urgent" | "important" | "info";

export interface Advice {
  key: string;
  level: AdviceLevel;
  title: string;
  why: string;
  action: { label: string; to: string } | null;
}

/** Chegara qiymatlar: o'zgarsa shu yerda va docs/04 BR-R03 da */
export const ADVICE = {
  /** Sinf mavzuda qiynalyapti: shu foizdan past */
  weakPercent: 50,
  weakMinStudents: 3,
  weakMinAnswers: 15,
  days: 30,
  /** Shu kun ichida ochiladigan haftalik test bo'lmasa */
  weeklyAheadDays: 7,
  /** Qoralama savol shu kundan beri turgan bo'lsa */
  draftDays: 3,
  /** Oxirgi haftalikni topshirganlar shu foizdan kam bo'lsa */
  participationPercent: 50,
} as const;

const RANK: Record<AdviceLevel, number> = { urgent: 0, important: 1, info: 2 };
export const sortAdvice = (a: Advice[]) => [...a].sort((x, y) => RANK[x.level] - RANK[y.level]);
