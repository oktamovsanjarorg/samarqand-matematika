import type { AttendanceStatus } from "./groups";
import { z } from "zod";
import { telegramProfileSchema } from "./telegram-profile";

import { STUDENT_ACCESS, type StudentAccess } from "./student-consts";

export * from "./student-consts";

/** Ism-familiya: kamida ikki so'z, faqat harflar, apostrof va chiziqcha (BR-S01) */
export const fullName = z
  .string()
  .trim()
  .transform((s) => s.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(3, "Ism va familiyani yozing")
      .max(80)
      .regex(
        /^[\p{L}ʻʼ'`-]+( [\p{L}ʻʼ'`-]+)+$/u,
        "Ism va familiyani harflar bilan, boʻsh joy bilan ajratib yozing",
      ),
  );

export const fullNameBody = z.object({ fullName });
export type FullNameBody = z.infer<typeof fullNameBody>;

/** Bot: foydalanuvchi "raqamni ulashish" tugmasini bosdi (request_contact) */
export const userPhoneBody = z.object({
  from: telegramProfileSchema,
  contact: z.object({ phone_number: z.string().min(5).max(20), user_id: z.number().int().optional() }),
});
export type UserPhoneBody = z.infer<typeof userPhoneBody>;

export const adminStudentPatch = z
  .object({ fullName: fullName.nullable(), accessMode: z.enum(STUDENT_ACCESS) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Oʻzgartirish yoʻq");
export type AdminStudentPatch = z.infer<typeof adminStudentPatch>;

/** O'quvchining o'z profili: onboarding va kirish holati */
export interface MyProfile {
  fullName: string | null;
  hasPhone: boolean;
  /** Ism yoki telefon yo'q: ilova avval onboarding'ni ko'rsatadi */
  needsOnboarding: boolean;
  /** BR-A04 qadamlari: Asosiy ekranda nima yetishmayotgani ko'rsatiladi */
  access: { full: boolean; accepted: boolean; parentApproved: boolean; paid: boolean; mode: StudentAccess };
}

export interface AdminStudentRow {
  id: string;
  telegramName: string;
  username: string | null;
  fullName: string | null;
  phone: string | null;
  accessMode: StudentAccess;
  acceptedAt: string | null;
  /** Offline guruh nomi (T-054) */
  groupName: string | null;
  /** Faol obuna tugash vaqti; obuna yo'q yoki tugagan bo'lsa null (T-110) */
  paidUntil: string | null;
  /** Tasdiqlangan ota-onalar telefoni (T-123): ustoz qo'ng'iroq qilishi uchun */
  parentPhones: string[];
  createdAt: string;
  lastSeenAt: string | null;
  groupId: string | null;
  /** Telegram'ga ulangan; false: ustoz qo'lda kiritgan, botga hali kirmagan (T-186) */
  linked: boolean;
  /** Bloklangan: ilovaga kira olmaydi (T-185) */
  blocked: boolean;
  blockedReason: string | null;
  /** Ustoz tasdig'ini kutayotgan ota-ona so'rovlari */
  parentsPending: number;
  /** Oxirgi 30 kun davomati: keldi (kechikkan ham), kelmadi, jami belgi */
  attendance30: { present: number; absent: number; total: number };
}

/** Qabul qilish: guruhga qo'shib yoki online (guruhsiz) o'quvchi sifatida (T-185) */
export const studentAcceptBody = z.object({ groupId: z.string().min(1).nullable().optional() });
export const studentBlockBody = z.object({
  blocked: z.boolean(),
  reason: z.string().trim().max(300).nullable().optional(),
});

/** Profil: offline maktab ma'lumoti (T-065). Faqat o'quvchi o'zi ko'radi */
export interface MySchool {
  group: { name: string; schedule: string | null } | null;
  /** Ota-ona ulanishlari: tasdiqlangan va ustoz ko'rib chiqishini kutayotgan */
  parents: { approved: number; pending: number };
  /** Oxirgi 30 kun davomati, yangisi birinchi */
  attendance: { date: string; status: AttendanceStatus }[];
}
