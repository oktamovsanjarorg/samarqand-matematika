import { z } from "zod";
import { parseCsvTable, type CsvLine } from "./csv-read";
import { questionInput, type QuestionInput, type QuestionType } from "./question";

/**
 * Excel (CSV) dan savol import (T-100). Birinchi qator sarlavha:
 * Tur · Savol · A..H (variantlar) · Javob · Yechim · Qiyinlik · Teglar. Faqat "Savol" majburiy.
 * Tur bo'sh bo'lsa aniqlanadi: variant bor → bitta (javobda bir nechta harf bo'lsa bir nechta),
 * javob yo'q → yozma, son ko'rinishida → son, aks holda ifoda. Moslashtirish turi import qilinmaydi.
 */
export const QUESTION_IMPORT_MAX = 300;

export interface QuestionCsvRow {
  line: number;
  input: QuestionInput;
}
export interface QuestionCsvError {
  line: number;
  message: string;
}
export interface QuestionCsvResult {
  rows: QuestionCsvRow[];
  errors: QuestionCsvError[];
}

/** dryRun: faqat tekshirish (oldindan ko'rish). Xato bo'lsa hech narsa saqlanmaydi */
export const questionImportInput = z.object({
  csv: z.string().min(1, "Fayl boʻsh").max(500_000, "Fayl juda katta: bir faylda 300 tagacha savol"),
  dryRun: z.boolean(),
});
export type QuestionImportInput = z.infer<typeof questionImportInput>;

export interface QuestionImportResult {
  ready: { line: number; type: QuestionType; text: string }[];
  errors: QuestionCsvError[];
  /** Saqlangan savollar soni (qoralama sifatida); dryRun yoki xato bo'lsa 0 */
  created: number;
  /** Saqlangan savollar fayldagi tartibda: haftalik testga darhol qo'shish uchun (T-157) */
  questions: { id: string; type: QuestionType; text: string }[];
}

type Field = "type" | "text" | "answer" | "solution" | "difficulty" | "skills";
interface Columns {
  fields: Partial<Record<Field, number>>;
  options: [string, number][];
}

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'’`\s-]/g, "");
const HEADERS: Record<string, Field> = {
  tur: "type",
  turi: "type",
  type: "type",
  savol: "text",
  savolmatni: "text",
  matn: "text",
  question: "text",
  javob: "answer",
  togrijavob: "answer",
  answer: "answer",
  yechim: "solution",
  solution: "solution",
  qiyinlik: "difficulty",
  difficulty: "difficulty",
  teg: "skills",
  teglar: "skills",
  tags: "skills",
  skills: "skills",
};
const TYPES: Record<string, QuestionType> = {
  bitta: "SINGLE",
  bittajavob: "SINGLE",
  single: "SINGLE",
  birnechta: "MULTIPLE",
  birnechtajavob: "MULTIPLE",
  kop: "MULTIPLE",
  multiple: "MULTIPLE",
  son: "NUMERIC",
  sonjavob: "NUMERIC",
  numeric: "NUMERIC",
  ifoda: "EXPRESSION",
  expression: "EXPRESSION",
  yozma: "WRITTEN",
  yozmayechim: "WRITTEN",
  written: "WRITTEN",
};
const LEVELS: Record<string, number> = { "1": 1, "2": 2, "3": 3, oson: 1, orta: 2, qiyin: 3 };
const FIELD_LABELS: Record<string, string> = {
  text: "Savol",
  options: "Variantlar",
  answer: "Javob",
  solution: "Yechim",
  difficulty: "Qiyinlik",
  skills: "Teglar",
};

const list = (v: string) =>
  v
    .toLowerCase()
    .split(/[\s,;]+/)
    .filter(Boolean);

/** Teglar vergul bilan: "Kvadrat tenglama, qoʻshish" → ["kvadrat-tenglama", "qoshish"] */
const tags = (v: string) =>
  v
    .split(/[,;]+/)
    .map((t) =>
      t
        .trim()
        .toLowerCase()
        .replace(/[ʻʼ'’`]/g, "")
        .replace(/\s+/g, "-"),
    )
    .filter(Boolean);

function columns(head: string[]): Columns {
  const c: Columns = { fields: {}, options: [] };
  head.forEach((h, i) => {
    const key = norm(h);
    const field = HEADERS[key];
    if (field && c.fields[field] === undefined) c.fields[field] = i;
    else if (/^[a-h]$/.test(key)) c.options.push([key, i]);
  });
  return c;
}

function typeOf(raw: string, hasOptions: boolean, answer: string): QuestionType | null {
  if (raw) return TYPES[norm(raw)] ?? null;
  if (hasOptions) return list(answer).length > 1 ? "MULTIPLE" : "SINGLE";
  if (!answer) return "WRITTEN";
  return /^[-+]?[\d\s.,/]+$/.test(answer) ? "NUMERIC" : "EXPRESSION";
}

/** Qatordan zod tekshiradigan obyekt */
function draft(cols: Columns, row: CsvLine): { value: unknown } | { error: string } {
  const get = (f: Field) => {
    const i = cols.fields[f];
    return i === undefined ? "" : (row.cells[i] ?? "");
  };
  const options = cols.options.flatMap(([id, i]) => (row.cells[i] ? [{ id, text: row.cells[i] }] : []));
  const answer = get("answer");
  const type = typeOf(get("type"), options.length > 0, answer);
  if (!type)
    return { error: `Tur tushunilmadi: «${get("type")}» (bitta, bir nechta, son, ifoda yoki yozma)` };
  const level = get("difficulty");
  if (level && !LEVELS[norm(level)]) return { error: "Qiyinlik: 1, 2, 3 yoki oson, oʻrta, qiyin" };
  const base = {
    type,
    text: get("text"),
    ...(get("solution") ? { solution: get("solution") } : {}),
    ...(level ? { difficulty: LEVELS[norm(level)] } : {}),
    ...(get("skills") ? { skills: tags(get("skills")) } : {}),
  };
  if (type === "SINGLE") return { value: { ...base, options, answer: { optionId: list(answer)[0] ?? "" } } };
  if (type === "MULTIPLE") return { value: { ...base, options, answer: { optionIds: list(answer) } } };
  if (type === "NUMERIC" || type === "EXPRESSION") return { value: { ...base, answer: { value: answer } } };
  return { value: base };
}

function toQuestion(cols: Columns, row: CsvLine): QuestionCsvRow | QuestionCsvError {
  const d = draft(cols, row);
  if ("error" in d) return { line: row.line, message: d.error };
  const parsed = questionInput.safeParse(d.value);
  if (parsed.success) return { line: row.line, input: parsed.data };
  const issue = parsed.error.issues[0];
  const field = FIELD_LABELS[String(issue?.path[0] ?? "")];
  return { line: row.line, message: `${field ? `${field}: ` : ""}${issue?.message ?? "Notoʻgʻri qator"}` };
}

export function parseQuestionCsv(text: string): QuestionCsvResult {
  const [head, ...body] = parseCsvTable(text);
  if (!head) return { rows: [], errors: [{ line: 1, message: "Fayl boʻsh" }] };
  const cols = columns(head.cells);
  if (cols.fields.text === undefined)
    return {
      rows: [],
      errors: [{ line: head.line, message: "Birinchi qatorda «Savol» ustuni boʻlishi kerak" }],
    };
  if (body.length > QUESTION_IMPORT_MAX)
    return {
      rows: [],
      errors: [{ line: 1, message: `Bir faylda koʻpi bilan ${QUESTION_IMPORT_MAX} ta savol` }],
    };
  const result: QuestionCsvResult = { rows: [], errors: [] };
  for (const row of body) {
    const q = toQuestion(cols, row);
    if ("input" in q) result.rows.push(q);
    else result.errors.push(q);
  }
  return result;
}
