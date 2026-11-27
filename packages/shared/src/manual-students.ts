import { z } from "zod";
import { fullName } from "./profile";

/**
 * Ustoz o'quvchini qo'lda kiritadi (T-186): har qatorda "Ism Familiya, telefon". Yozuv Telegram'siz
 * saqlanadi va o'quvchi botda shu raqamni ulashganda avtomatik bog'lanadi.
 */
export const MANUAL_MAX_LINES = 200;

/** O'zbek raqami: 9 raqam (kodsiz) yoki 998 bilan 12 raqam; natija "+998XXXXXXXXX" */
export function normUzPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 9) return `+998${d}`;
  if (d.length === 12 && d.startsWith("998")) return `+${d}`;
  return null;
}

export type ParsedStudentLine = { fullName: string; phone: string } | { error: string };

/** "Ism Familiya, +998 90 123 45 67" (ajratuvchi: vergul, nuqtali vergul yoki tab) */
export function parseStudentLine(line: string): ParsedStudentLine {
  const parts = line
    .split(/[,;\t]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const phoneAt = parts.map((p) => /\d/.test(p)).lastIndexOf(true);
  if (phoneAt < 0) return { error: "Telefon yoʻq" };
  const phone = normUzPhone(parts[phoneAt] ?? "");
  if (!phone) return { error: "Telefon notoʻgʻri: 9 yoki 998 bilan 12 raqam boʻlsin" };
  const name = fullName.safeParse(parts.filter((_, i) => i !== phoneAt).join(" "));
  if (!name.success) return { error: name.error.issues[0]?.message ?? "Ism notoʻgʻri" };
  return { fullName: name.data, phone };
}

export const studentBulkInput = z.object({
  text: z.string().trim().min(1, "Roʻyxat boʻsh").max(20_000, "Roʻyxat juda uzun"),
  groupId: z.string().min(1).nullable().optional(),
});
export type StudentBulkInput = z.infer<typeof studentBulkInput>;

export interface StudentBulkResult {
  created: { id: string; fullName: string; phone: string }[];
  /** line: 1 dan boshlanadi */
  skipped: { line: number; text: string; reason: string }[];
}
