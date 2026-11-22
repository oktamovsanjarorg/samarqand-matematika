import { z } from "zod";

/** Xodim: ustoz (egasi, .env dagi OWNER_*) yoki yordamchi (T-086) */
export interface StaffRow {
  id: string;
  name: string;
  username: string | null;
  role: "TEACHER" | "ASSISTANT";
  lastSeenAt: string | null;
}

export const staffAdd = z.object({ userId: z.string().min(1) });
export type StaffAdd = z.infer<typeof staffAdd>;

/** T-155: yordamchini havola bilan taklif qilish. Bitta faol havola, 24 soat, bir marta ishlaydi */
export const STAFF_INVITE_TTL_MS = 24 * 3_600_000;
export interface StaffInvite {
  /** t.me/<bot>?start=s_<kod>; bot nomi aniqlanmasa null (kod baribir ishlaydi) */
  link: string | null;
  code: string;
  expiresAt: string;
}
/** Bot → API: taklif kodini ishlatish natijasi */
export type StaffInviteStatus = "ok" | "invalid" | "already" | "teacher" | "parent" | "blocked";
export const staffInviteUse = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
});
