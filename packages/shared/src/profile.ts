import { z } from "zod";
import { telegramProfileSchema } from "./telegram-profile";

export const STUDENT_ACCESS = ["AUTO", "FREE", "CLOSED"] as const;
export type StudentAccess = (typeof STUDENT_ACCESS)[number];

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
  createdAt: string;
  lastSeenAt: string | null;
}
