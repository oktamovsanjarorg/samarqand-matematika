import { z } from "zod";
import {
  offlineSections,
  type OfflineRasch,
  type OfflineSection,
  type OfflineSectionScore,
} from "./offline-sections";

/**
 * Offline (qog'ozda yozilgan) test (T-180, T-181, BR-G04): skaner eksporti yoki Q1..Qn matritsadan
 * har savol javobi olinadi, ball va daraja Rasch bilan (faol imtihon shabloni), fan bo'limlari ustozdan.
 * Fayl Excel yoki CSV: admin brauzerda CSV matnga o'giradi.
 */
export const OFFLINE_MAX_ROWS = 500;

/** Telefonni solishtirish uchun: oxirgi 9 raqam (998 kodisiz) */
export const phoneKey = (p: string | null | undefined) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : null;
};

const csv = z.string().min(1, "Fayl boʻsh").max(900_000, "Fayl juda katta");

export const offlinePreviewInput = z.object({ csv, groupId: z.string().min(1).nullable().optional() });

export const offlineImportInput = offlinePreviewInput.extend({
  title: z.string().trim().min(2, "Nom kamida 2 belgi").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD koʻrinishida"),
  /** Fan bo'limlari; bo'sh bo'lsa skaner bo'limlari (savol turlari) olinadi */
  sections: offlineSections,
});
export type OfflineImportInput = z.infer<typeof offlineImportInput>;

export const offlineSectionsBody = z.object({ sections: offlineSections });
export const offlineMatchBody = z.object({ userId: z.string().min(1).nullable() });

export type OfflineMatchBy = "phone" | "name";

export interface OfflinePreviewRow {
  line: number;
  name: string;
  phone: string | null;
  correct: number;
  percent: number;
  score: number;
  grade: string | null;
  match: { userId: string; name: string; by: OfflineMatchBy } | null;
}

export interface OfflinePreview {
  format: "omr" | "matrix";
  /** Skanerdagi imtihon nomi: test nomi uchun taklif */
  exam: string | null;
  questionCount: number;
  /** Fayldagi bo'limlar (skaner: savol turlari) */
  fileSections: OfflineSection[];
  /** Ustozning oxirgi marta yozgan fan bo'limlari, savol soni mos bo'lsa */
  savedSections: OfflineSection[] | null;
  scaleMax: number;
  /** Savol qiyinligi hisobga olindimi (30+ qatnashchi) */
  calibrated: boolean;
  rows: OfflinePreviewRow[];
}

export interface AdminOfflineTestRow {
  id: string;
  title: string;
  date: string;
  groupName: string | null;
  questionCount: number;
  count: number;
  matched: number;
  avgPercent: number | null;
  avgScore: number | null;
  scaleMax: number;
  notifiedAt: string | null;
}

export interface AdminOfflineResultRow {
  id: string;
  rank: number;
  line: number;
  name: string;
  phone: string | null;
  userId: string | null;
  userName: string | null;
  answers: string;
  correct: number;
  wrong: number;
  blank: number;
  percent: number;
  score: number;
  grade: string | null;
  notifiedAt: string | null;
}

export interface AdminOfflineTestDetail extends AdminOfflineTestRow {
  format: "omr" | "matrix";
  sections: OfflineSection[];
  rasch: OfflineRasch;
  stats: {
    median: number | null;
    /** 0–9, 10–19, … 90–100 foiz */
    buckets: { label: string; count: number }[];
    /** Daraja bo'yicha soni (oxirgisi: darajasiz) */
    grades: { label: string; count: number }[];
    questions: { q: number; correctPct: number; blankPct: number }[];
    sections: { title: string; questions: number[]; avgPercent: number }[];
  };
  rows: AdminOfflineResultRow[];
}

/** Bir nechta offline test bo'yicha reyting (faqat moslangan o'quvchilar) */
export interface OfflineRankingRow {
  userId: string;
  name: string;
  groupName: string | null;
  tests: number;
  avgPercent: number;
  avgScore: number;
  best: number;
  last: number;
}

/** O'quvchi (va ota-ona) ko'radigan natija: ro'yxatda */
export interface StudentOfflineResult {
  id: string;
  title: string;
  date: string;
  questionCount: number;
  correct: number;
  percent: number;
  score: number;
  scaleMax: number;
  grade: string | null;
  place: number;
  participants: number;
}

export interface StudentOfflineDetail extends StudentOfflineResult {
  wrong: number;
  blank: number;
  answers: string;
  /** Har savoldan olingan ball (to'g'ri yechilgan savollarga og'irligiga qarab) */
  points: number[];
  sections: OfflineSectionScore[];
  avgPercent: number;
}
