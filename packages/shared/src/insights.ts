import type { MyPayment } from "./billing";
import type { StudentOfflineResult } from "./offline";
import type { ChildWeeklyRow } from "./parent";
import type { AdminStudentRow, MyProfile, MySchool } from "./profile";
import type { MyStats } from "./stats";
/** Tavsiyalar (5-bosqich): faqat faktlardan, AI'siz (BR-R01) */
export type InsightSource = "topic" | "weekly" | "mock";

export interface TopicRecommendation {
  topicId: string;
  topicTitle: string;
  correct: number;
  total: number;
  percent: number;
  /** Qaysi testlardan nechta javob */
  sources: Record<InsightSource, number>;
  /** Eng ko'p xato qilingan ko'nikma teglari (ko'pi bilan 2 ta) */
  weakSkills: string[];
  /** Mavzuning birinchi nashr qilingan darsi */
  lessonId: string | null;
}

export interface MyRecommendations {
  /** Hisobga olingan javoblar soni (oxirgi 90 kun) */
  basis: number;
  items: TopicRecommendation[];
}

export const INSIGHT_DAYS = 90;
export const WEAK_MIN_ANSWERS = 3;
export const WEAK_PERCENT = 60;

/** Ustozga: e'tibor kerak o'quvchi va sabablari (T-063, BR-R02) */
export type AttentionCode = "INACTIVE" | "DROP" | "ABSENT" | "MISSED_WEEKLY";

export interface AttentionReason {
  code: AttentionCode;
  /** Faktli izoh: "12 kundan beri kirmagan" */
  text: string;
}

export interface AttentionRow {
  userId: string;
  name: string;
  phone: string | null;
  groupName: string | null;
  reasons: AttentionReason[];
}

export const INACTIVE_DAYS = 7;
export const DROP_POINTS = 20;
export const ABSENT_WINDOW_DAYS = 14;
export const ABSENT_MIN = 2;

/** Admin: bitta o'quvchining to'liq kartasi (T-068) */
export interface AdminStudentCard {
  student: AdminStudentRow;
  access: MyProfile["access"];
  /** Faol obuna qachongacha (T-094); faol obuna yo'q bo'lsa null */
  paidUntil: string | null;
  reasons: AttentionReason[];
  weak: TopicRecommendation[];
  stats: MyStats;
  school: MySchool;
  offline: StudentOfflineResult[];
  /** Yopilgan haftalik testlar, o'rni bilan (T-111) */
  weekly: ChildWeeklyRow[];
  /** Oxirgi cheklar (T-111) */
  payments: MyPayment[];
}
