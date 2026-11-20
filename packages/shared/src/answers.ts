import type { QuestionView } from "./question";

/** O'quvchi javobi (shakli savol turiga qarab, serverda tekshiriladi) */
export type AnswerValue =
  | { optionId: string }
  | { optionIds: string[] }
  | { value: string }
  | { pairs: Record<string, string> }
  | { text?: string };

/** Savol + javob: Mini App va API (AI prompti) uchun umumiy */
const has = <K extends string>(r: unknown, k: K): r is Record<K, unknown> =>
  typeof r === "object" && r !== null && k in r;

/** Savolga javob berilganmi (topshirishdan oldin ogohlantirish uchun) */
export function isAnswered(q: QuestionView, r: unknown): boolean {
  if (has(r, "optionId")) return true;
  if (has(r, "optionIds")) return Array.isArray(r.optionIds) && r.optionIds.length > 0;
  if (has(r, "value")) return String(r.value).trim() !== "";
  if (has(r, "text")) return String(r.text ?? "").trim() !== "";
  if (has(r, "pairs")) return Object.keys(r.pairs as object).length === (q.left?.length ?? 0);
  return false;
}

const optionText = (q: QuestionView, id: string) => {
  const o = q.options?.find((x) => x.id === id);
  return o ? `${id.toUpperCase()}) ${o.text}` : id;
};

function pairsText(q: QuestionView, pairs: Record<string, string>): string | null {
  const parts = (q.left ?? [])
    .filter((l) => pairs[l.id])
    .map((l) => `${l.id.toUpperCase()} → ${pairs[l.id]}`);
  return parts.length ? parts.join(", ") : null;
}

const nonEmpty = (v: unknown) => (String(v ?? "").trim() ? String(v) : null);

/** Javob yoki to'g'ri javobni matn qilib ko'rsatish (natija sahifasi, AI tekshiruvi) */
export function describeResponse(q: QuestionView, r: unknown): string | null {
  if (has(r, "optionId")) return optionText(q, String(r.optionId));
  if (has(r, "optionIds") && Array.isArray(r.optionIds))
    return nonEmpty(r.optionIds.map((id) => optionText(q, String(id))).join("; "));
  if (has(r, "value")) return nonEmpty(r.value);
  if (has(r, "text")) return nonEmpty(r.text);
  if (has(r, "pairs")) return pairsText(q, r.pairs as Record<string, string>);
  return null;
}
