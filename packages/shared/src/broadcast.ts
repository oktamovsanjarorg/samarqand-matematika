import { z } from "zod";

/** Ustozdan e'lon (T-116): kimga yuboriladi */
export const BROADCAST_AUDIENCES = ["students", "parents", "all", "unlinked"] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];
export const BROADCAST_AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  students: "Oʻquvchilarga",
  parents: "Ota-onalarga",
  all: "Oʻquvchi va ota-onalarga",
  unlinked: "Ota-onasi ulanmagan oʻquvchilarga",
};

/** T-137: "ota-onasi ulanmagan" tanlanganda taklif qilinadigan matn (ustoz o'zgartirishi mumkin) */
export const UNLINKED_REMINDER_TEXT =
  "Assalomu alaykum! Ota-onangiz natijalaringiz va davomatingizni koʻrib turishi uchun ularni ulang: botga /ota yuboring va kelgan havolani ota-onangizga joʻnating.";

/** dryRun: faqat qabul qiluvchilar sonini qaytaradi (yuborishdan oldin tasdiqlash uchun) */
export const broadcastInput = z.object({
  text: z.string().trim().min(1, "Matn boʻsh").max(2000, "Matn 2000 belgidan oshmasin"),
  audience: z.enum(BROADCAST_AUDIENCES),
  /** Faqat shu guruh o'quvchilari (va ularning ota-onalari); bo'lmasa hammasi */
  groupId: z.string().min(1).max(40).nullable(),
  dryRun: z.boolean(),
  /** Xabar ostida "Ilovani ochish" tugmasi (T-130) */
  appButton: z.boolean().optional(),
});
export type BroadcastInput = z.infer<typeof broadcastInput>;

export interface BroadcastResult {
  recipients: number;
  /** Telegram qabul qilgan xabarlar (botni bloklaganlarga yetmaydi); dryRun da 0 */
  sent: number;
}

/** Yuborilgan e'lonlar tarixi (T-117): jurnaldan olinadi */
export interface BroadcastLogRow {
  id: string;
  at: string;
  audience: BroadcastAudience;
  /** null: barcha guruhlar; o'chirilgan guruh bo'lsa "o'chirilgan guruh" */
  groupName: string | null;
  recipients: number;
  sent: number;
  text: string;
}
