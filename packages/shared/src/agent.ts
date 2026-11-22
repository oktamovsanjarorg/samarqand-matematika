import { z } from "zod";

/**
 * Admin panel AI agenti (T-156): ustoz oddiy so'z bilan yozadi, agent panel amallarini bajaradi.
 * O'qish amallari darhol, o'zgartiruvchi amallar faqat ustoz tasdiqlagach bajariladi.
 * Suhbat (transcript) serverda saqlanmaydi: kliyent har so'rovda qaytaradi, tasdiq imzolangan token bilan.
 */
export const AGENT_MESSAGE_MAX = 4000;

/** Claude xabarlari: kliyent uchun shaffof, server tekshiradi */
export const agentTranscript = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]),
    }),
  )
  .max(400);
export type AgentTranscript = z.infer<typeof agentTranscript>;

export const agentChatBody = z.object({
  transcript: agentTranscript,
  message: z.string().trim().min(1, "Xabar boʻsh").max(AGENT_MESSAGE_MAX),
});
export type AgentChatBody = z.infer<typeof agentChatBody>;

export const agentConfirmBody = z.object({
  transcript: agentTranscript,
  token: z.string().min(10).max(20_000),
  approve: z.boolean(),
});
export type AgentConfirmBody = z.infer<typeof agentConfirmBody>;

export type AgentItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  /** Bajarilgan amal: ok=false — xato yoki ustoz rad etdi */
  | { kind: "action"; title: string; ok: boolean };

/** Tasdiq kutayotgan amal: nima qilinadi va oldindan ko'rish (masalan, e'lon nechta odamga boradi) */
export interface AgentPending {
  token: string;
  title: string;
  lines: string[];
}

export interface AgentReply {
  transcript: AgentTranscript;
  items: AgentItem[];
  pending: AgentPending | null;
}
