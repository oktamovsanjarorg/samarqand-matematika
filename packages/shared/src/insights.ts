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
