import { OFFLINE_MAX_ROWS } from "./offline";
import type { OfflineSection } from "./offline-sections";

/**
 * Offline test fayli (T-180): har o'quvchining har savol bo'yicha javobi.
 * Ikki format: skaner (OMR) eksporti va Q1..Qn matritsa. Javob satri: har savolga bitta harf,
 * c to'g'ri, w xato, b bo'sh (belgilanmagan), - savol yo'q.
 */
export type OfflineMark = "c" | "w" | "b" | "-";

export interface OfflineFileRow {
  line: number;
  name: string;
  phone: string | null;
  answers: string;
}

export interface OfflineFile {
  format: "omr" | "matrix";
  /** Skanerdagi imtihon nomi ("Экзамен"), bo'lmasa null */
  exam: string | null;
  questionCount: number;
  /** Skanerdagi "Sertifikat -a-b" ustunlari: savol turlari bo'yicha bo'limlar */
  sections: OfflineSection[];
  rows: OfflineFileRow[];
}

export const OFFLINE_MAX_QUESTIONS = 200;

/** Qo'shtirnoqli maydonlarni hisobga olib bitta qatorni bo'ladi */
export function splitCsvLine(line: string, sep: string): string[] {
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

const NAME = /^(ism|ismi|f\.?\s*i\.?\s*(o|sh)\.?|familiya|o.?quvchi|name|имя|фио)$/i;
const PHONE = /^(tel|telefon|phone|телефон)/i;
const OMR_MARKS = /^Q\s*(\d+)\s*Marks$/i;
const MATRIX_Q = /^Q\s*(\d+)$/i;
const OMR_SECTION = /^Sertifikat\s*-\s*(\d+)\s*-\s*(\d+)$/i;

interface Table {
  head: string[];
  rows: { line: number; cells: string[] }[];
}

function readTable(text: string): Table {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const at = lines.findIndex((l) => l.trim());
  if (at < 0) throw new Error("Fayl boʻsh");
  const sep = detectSep(lines[at] ?? "");
  const rows = lines
    .slice(at + 1)
    .map((l, i) => ({ line: at + i + 2, cells: splitCsvLine(l, sep) }))
    .filter((r) => r.cells.some((c) => c));
  if (!rows.length) throw new Error("Natija qatorlari yoʻq");
  if (rows.length > OFFLINE_MAX_ROWS) throw new Error(`Koʻpi bilan ${OFFLINE_MAX_ROWS} qator`);
  return { head: splitCsvLine(lines[at] ?? "", sep), rows };
}

/** Savol raqami bo'yicha ustunlar: 1..N ketma-ket bo'lishi shart */
function questionColumns(head: string[], re: RegExp): number[] {
  const cols = head
    .map((h, i) => ({ q: Number(re.exec(h)?.[1] ?? 0), i }))
    .filter((x) => x.q > 0)
    .sort((a, b) => a.q - b.q);
  cols.forEach((c, k) => {
    if (c.q !== k + 1) throw new Error(`${k + 1}-savol ustuni yoʻq`);
  });
  if (cols.length > OFFLINE_MAX_QUESTIONS) throw new Error(`Koʻpi bilan ${OFFLINE_MAX_QUESTIONS} savol`);
  return cols.map((c) => c.i);
}

const cell = (cells: string[], i: number) => (i >= 0 ? (cells[i] ?? "").trim() : "");

function person(r: Table["rows"][number], nameCol: number, phoneCol: number) {
  const name = cell(r.cells, nameCol).replace(/^'/, "");
  if (!name) throw new Error(`${r.line}-qator: ism yoʻq`);
  return { line: r.line, name, phone: cell(r.cells, phoneCol) || null };
}

/** Skaner: Marks > 0 to'g'ri; Options bo'sh bo'lsa belgilanmagan */
function parseOmr(t: Table): OfflineFile {
  const marks = questionColumns(t.head, OMR_MARKS);
  const lower = t.head.map((h) => h.toLowerCase().replace(/\s+/g, " "));
  const options = marks.map((_, k) => lower.indexOf(`q ${k + 1} options`));
  const nameCol = t.head.findIndex((h) => NAME.test(h));
  const examCol = t.head.findIndex((h) => /^(экзамен|exam|imtihon)$/i.test(h));
  const rows = t.rows.map((r) => {
    const answers = marks
      .map((i, k) => {
        const v = Number(cell(r.cells, i).replace(",", "."));
        if (v > 0) return "c";
        return (options[k] ?? -1) >= 0 && !cell(r.cells, options[k] ?? -1) ? "b" : "w";
      })
      .join("");
    return { ...person(r, nameCol >= 0 ? nameCol : 0, -1), answers };
  });
  const exam = t.rows.map((r) => cell(r.cells, examCol)).find(Boolean) ?? null;
  return { format: "omr", exam, questionCount: marks.length, sections: omrSections(t, rows), rows };
}

/**
 * "Sertifikat -a-b" ustunlari. Oxirgi bo'lim fayldagi yig'indiga mos kelmasa (ikki qismli ochiq savollar
 * sabab katak ko'p bo'ladi) va oxirgi katakkacha cho'zilganda mos kelsa, cho'ziladi.
 */
function omrSections(t: Table, rows: OfflineFileRow[]): OfflineSection[] {
  const n = rows[0]?.answers.length ?? 0;
  const cols = t.head
    .map((h, i) => ({ m: OMR_SECTION.exec(h), i }))
    .filter((x): x is { m: RegExpExecArray; i: number } => !!x.m);
  const correctIn = (a: string, from: number, to: number) =>
    [...a.slice(from - 1, to)].filter((x) => x === "c").length;
  return cols.map(({ m, i }, k) => {
    const from = Number(m[1]);
    const to = Math.min(Number(m[2]), n);
    const fits = (end: number) =>
      t.rows.every((r, j) => {
        const v = cell(r.cells, i);
        return !v || Number(v) === correctIn(rows[j]?.answers ?? "", from, end);
      });
    const end = k === cols.length - 1 && !fits(to) && fits(n) ? n : to;
    return { title: `${from}–${Number(m[2])}-savollar`, questions: range(from, end) };
  });
}

/** Matritsa: 1 to'g'ri, 0 xato, bo'sh katak savol berilmagan (bo'sh javob) */
function parseMatrix(t: Table): OfflineFile {
  const qs = questionColumns(t.head, MATRIX_Q);
  const nameCol = t.head.findIndex((h) => NAME.test(h));
  const phoneCol = t.head.findIndex((h) => PHONE.test(h));
  const rows = t.rows.map((r) => {
    const answers = qs
      .map((i) => {
        const v = cell(r.cells, i);
        if (!v) return "b";
        if (v === "1") return "c";
        if (v === "0") return "w";
        throw new Error(`${r.line}-qator: katakda faqat 1, 0 yoki boʻsh boʻladi ("${v}")`);
      })
      .join("");
    return { ...person(r, nameCol >= 0 ? nameCol : 0, phoneCol), answers };
  });
  return { format: "matrix", exam: null, questionCount: qs.length, sections: [], rows };
}

/** Fayl turini sarlavhadan aniqlaydi; tushunilmasa o'zbekcha sabab bilan xato */
export function parseOfflineFile(text: string): OfflineFile {
  const t = readTable(text);
  if (t.head.some((h) => OMR_MARKS.test(h))) return parseOmr(t);
  if (t.head.some((h) => MATRIX_Q.test(h))) return parseMatrix(t);
  throw new Error(
    "Fayl tanilmadi: skaner eksporti (Q 1 Marks …) yoki Q1, Q2 … ustunli jadval boʻlishi kerak",
  );
}

export function range(a: number, b: number): number[] {
  return Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
}
