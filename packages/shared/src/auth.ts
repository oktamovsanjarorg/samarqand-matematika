import { z } from "zod";
import { ROLES } from "./roles";

export const authTelegramBody = z.object({ initData: z.string().min(1).max(4096) });
export type AuthTelegramBody = z.infer<typeof authTelegramBody>;

export const meSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  username: z.string().nullable(),
  role: z.enum(ROLES),
});
export type Me = z.infer<typeof meSchema>;

export interface AuthResponse {
  token: string;
  expiresIn: string;
  user: Me;
}

export const ERROR_CODES = {
  BLOCKED: "BLOCKED",
  /** Pullik dars: to'liq kirish (BR-A04) yo'q */
  LOCKED: "LOCKED",
  /** Ichida mavzu yoki dars bor: avval ularni o'chirish kerak */
  NOT_EMPTY: "NOT_EMPTY",
  /** Ustoz qabul qilgan: ismni endi faqat ustoz o'zgartiradi (BR-S01) */
  NAME_LOCKED: "NAME_LOCKED",
  /** Yordamchi bu savol bo'yicha yordam bermaydi: haftalik test ochiq (BR-T01) */
  AI_BLOCKED: "AI_BLOCKED",
  /** Yordamchining kunlik limiti tugadi (BR-T03) */
  AI_LIMIT: "AI_LIMIT",
  /** AI o'chiq yoki javob bermadi */
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
} as const;

/** Admin panel: bot yuborgan bir martalik havoladagi token */
export const adminLinkBody = z.object({ token: z.string().min(20).max(200) });

/** Bir martalik admin kirish havolasining amal qilish muddati */
export const LOGIN_TOKEN_TTL_MS = 5 * 60 * 1000;
