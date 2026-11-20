import { z } from "zod";

/**
 * Yordamchi rejimlari (PLAN §7):
 * PRACTICE — mavzu testi savoli, ishora darajalari (BR-T02);
 * REVIEW — haftalik test yopilgach xatoni tushuntirish;
 * FREE — erkin savol (ochiq haftalik test savollari bo'yicha yordam yo'q, BR-T01).
 */
export const TUTOR_MODES = ["PRACTICE", "REVIEW", "FREE"] as const;
export type TutorMode = (typeof TUTOR_MODES)[number];

export const TUTOR_MESSAGE_MAX = 2000;

export const startTutorInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("PRACTICE"), attemptId: z.string().min(1), questionId: z.string().min(1) }),
  z.object({ mode: z.literal("REVIEW"), attemptId: z.string().min(1), questionId: z.string().min(1) }),
  z.object({ mode: z.literal("FREE") }),
]);
export type StartTutorInput = z.infer<typeof startTutorInput>;

export const tutorMessageInput = z.object({ text: z.string().trim().min(1).max(TUTOR_MESSAGE_MAX) });

export interface TutorMessageView {
  id: string;
  role: "USER" | "ASSISTANT";
  text: string;
  createdAt: string;
}

export interface TutorChatView {
  id: string;
  mode: TutorMode;
  messages: TutorMessageView[];
  /** Bugun qolgan so'rovlar (BR-T03) */
  remaining: number;
}
