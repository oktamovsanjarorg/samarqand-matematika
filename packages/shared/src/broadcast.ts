import { z } from "zod";

/** Ustozdan e'lon (T-116): kimga yuboriladi */
export const BROADCAST_AUDIENCES = ["students", "parents", "all"] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];
export const BROADCAST_AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  students: "Oʻquvchilarga",
  parents: "Ota-onalarga",
  all: "Oʻquvchi va ota-onalarga",
};

/** dryRun: faqat qabul qiluvchilar sonini qaytaradi (yuborishdan oldin tasdiqlash uchun) */
export const broadcastInput = z.object({
  text: z.string().trim().min(1, "Matn boʻsh").max(2000, "Matn 2000 belgidan oshmasin"),
  audience: z.enum(BROADCAST_AUDIENCES),
  /** Faqat shu guruh o'quvchilari (va ularning ota-onalari); bo'lmasa hammasi */
  groupId: z.string().min(1).max(40).nullable(),
  dryRun: z.boolean(),
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
