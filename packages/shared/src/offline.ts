import { z } from "zod";

/**
 * Tashqi (offline) test natijalari importi (T-056, Q-12 standart taklifi).
 * Fayl: Excel'dan "CSV" saqlangan jadval. Birinchi qator sarlavha: ism ustuni (ism, F.I.O, name),
 * ixtiyoriy telefon ustuni (telefon, tel, phone), qolgan ustunlar bo'limlar. Ajratuvchi ; , yoki tab.
 */
export const OFFLINE_MAX_ROWS = 500;

export interface OfflineCsvRow {
  line: number;
  name: string;
  phone: string | null;
  scores: number[];
  total: number;
}

export interface ParsedOfflineCsv {
  sections: string[];
  rows: OfflineCsvRow[];
  errors: { line: number; message: string }[];
}

const NAME_HEADER = /^(ism|ismi|f\.?\s*i\.?\s*o\.?|familiya|o.?quvchi|name)/i;
const PHONE_HEADER = /^(tel|telefon|phone)/i;

/** Qo'shtirnoqli maydonlarni hisobga olib bitta qatorni bo'ladi */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && quoted && line[i + 1] === '"') {
      cur += '"';
      i++;
    } else if (ch === '"') quoted = !quoted;
    else if (ch === sep && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const detectSep = (header: string) =>
  [";", "\t", ","].map((s) => ({ s, n: header.split(s).length })).sort((a, b) => b.n - a.n)[0]?.s ?? ";";

/** "12,5" va "12.5" ikkalasi ham son; bo'sh katak 0 */
const toScore = (v: string): number | null => {
  if (!v) return 0;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const round = (n: number) => Math.round(n * 100) / 100;

type RowResult = { error: string } | { row: Omit<OfflineCsvRow, "line"> };

function parseRow(cells: string[], cols: { name: number; phone: number; sections: number[] }): RowResult {
  const name = cells[cols.name]?.trim() ?? "";
  if (!name) return { error: "Ism yoʻq" };
  const scores = cols.sections.map((i) => toScore(cells[i] ?? ""));
  const bad = scores.findIndex((s) => s === null);
  if (bad >= 0)
    return { error: `${bad + 1}-boʻlim balli son emas: "${cells[cols.sections[bad] ?? 0] ?? ""}"` };
  const nums = scores as number[];
  const phone = cols.phone >= 0 ? cells[cols.phone]?.trim() || null : null;
  return { row: { name, phone, scores: nums, total: round(nums.reduce((s, x) => s + x, 0)) } };
}

export function parseOfflineCsv(text: string): ParsedOfflineCsv {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const headerAt = lines.findIndex((l) => l.trim());
  if (headerAt < 0) return { sections: [], rows: [], errors: [{ line: 1, message: "Fayl boʻsh" }] };
  const head = lines[headerAt] ?? "";
  const sep = detectSep(head);
  const header = splitLine(head, sep);
  const name = header.findIndex((h) => NAME_HEADER.test(h));
  const phone = header.findIndex((h) => PHONE_HEADER.test(h));
  const sectionCols = header.map((_, i) => i).filter((i) => i !== name && i !== phone && header[i]);
  const errors: ParsedOfflineCsv["errors"] = [];
  if (name < 0)
    errors.push({ line: headerAt + 1, message: "Sarlavhada ism ustuni yoʻq (ism, F.I.O yoki name)" });
  if (!sectionCols.length) errors.push({ line: headerAt + 1, message: "Boʻlim ustunlari yoʻq" });
  if (errors.length) return { sections: [], rows: [], errors };
  const rows: OfflineCsvRow[] = [];
  lines.slice(headerAt + 1).forEach((l, i) => {
    if (!l.trim()) return;
    const line = headerAt + i + 2;
    const r = parseRow(splitLine(l, sep), { name, phone, sections: sectionCols });
    if ("error" in r) errors.push({ line, message: r.error });
    else rows.push({ line, ...r.row });
  });
  if (rows.length > OFFLINE_MAX_ROWS)
    errors.push({ line: 0, message: `Koʻpi bilan ${OFFLINE_MAX_ROWS} qator` });
  if (!rows.length && !errors.length) errors.push({ line: headerAt + 2, message: "Natija qatorlari yoʻq" });
  return { sections: sectionCols.map((i) => header[i] ?? ""), rows, errors };
}

/** Telefonni solishtirish uchun: oxirgi 9 raqam (998 kodisiz) */
export const phoneKey = (p: string | null | undefined) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : null;
};

export const offlineImportInput = z.object({
  title: z.string().trim().min(2, "Nom kamida 2 belgi").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD koʻrinishida"),
  groupId: z.string().min(1).nullable().optional(),
  csv: z.string().min(1, "Fayl boʻsh").max(500_000),
});
export type OfflineImportInput = z.infer<typeof offlineImportInput>;

export const offlinePreviewInput = offlineImportInput.pick({ csv: true, groupId: true });
export const offlineMatchBody = z.object({ userId: z.string().min(1).nullable() });

export type OfflineMatchBy = "phone" | "name" | "manual";

export interface OfflinePreviewRow extends OfflineCsvRow {
  match: { userId: string; name: string; by: OfflineMatchBy } | null;
}

export interface OfflinePreview {
  sections: string[];
  rows: OfflinePreviewRow[];
  errors: ParsedOfflineCsv["errors"];
}

export interface AdminOfflineTestRow {
  id: string;
  title: string;
  date: string;
  groupName: string | null;
  sections: string[];
  count: number;
  matched: number;
}

export interface AdminOfflineResultRow {
  id: string;
  line: number;
  name: string;
  phone: string | null;
  scores: number[];
  total: number;
  userId: string | null;
  userName: string | null;
}

export interface AdminOfflineTestDetail extends AdminOfflineTestRow {
  rows: AdminOfflineResultRow[];
}
