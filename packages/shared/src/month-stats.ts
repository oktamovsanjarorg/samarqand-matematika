import { z } from "zod";

/** Oy bo'yicha statistika (T-162): "YYYY-MM", Toshkent vaqti */
export const statsMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Oy YYYY-MM koʻrinishida");

export interface MonthStats {
  month: string;
  students: {
    total: number;
    /** Shu oyda qabul qilinganlar */
    newThisMonth: number;
    /** Shu oyda mavzu yoki haftalik test topshirganlar */
    active: number;
  };
  attendance: {
    /** (keldi + kechikdi) / belgilangan, foiz; davomat olinmagan bo'lsa null */
    rate: number | null;
    marks: number;
    absent: number;
    byGroup: { groupId: string; name: string; days: number; rate: number | null; absent: number }[];
  };
  topicTests: { attempts: number; correctPercent: number | null };
  weekly: { tests: number; submitted: number; avgPercent: number | null };
  /** Eng yaxshi 5 o'quvchi: mavzu testlarida kamida 20 ta javob, to'g'ri foizi bo'yicha */
  top: { userId: string; name: string; percent: number; answers: number }[];
  /** Oxirgi 8 hafta (eskidan yangiga), dushanbadan: topshirilgan mavzu va haftalik testlar, faol o'quvchilar */
  weeks: { start: string; topicTests: number; weeklyTests: number; activeStudents: number }[];
}

export const STATS_TOP_MIN_ANSWERS = 20;
