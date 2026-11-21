import { expressionsEqual, numbersEqual } from "@samarqand/math";
import { responseSchemas, type CheckResult, type QuestionInput } from "@samarqand/shared";

type Of<T extends QuestionInput["type"]> = Extract<QuestionInput, { type: T }>;
const verdict = (ok: boolean): CheckResult => (ok ? "CORRECT" : "WRONG");

function single(q: Of<"SINGLE">, raw: unknown) {
  const r = responseSchemas.SINGLE.safeParse(raw);
  return verdict(r.success && r.data.optionId === q.answer.optionId);
}

/** Ko'p tanlov: to'plam aynan mos kelishi kerak, qisman ball yo'q (BR-Q02) */
function multiple(q: Of<"MULTIPLE">, raw: unknown) {
  const r = responseSchemas.MULTIPLE.safeParse(raw);
  if (!r.success) return "WRONG";
  const given = new Set(r.data.optionIds);
  const want = q.answer.optionIds;
  return verdict(given.size === want.length && want.every((id) => given.has(id)));
}

/** Son: ekvivalentlik bo'yicha, 3/4 = 0,75 (BR-M04) */
function numeric(q: Of<"NUMERIC">, raw: unknown) {
  const r = responseSchemas.NUMERIC.safeParse(raw);
  return verdict(r.success && numbersEqual(r.data.value, q.answer.value, q.answer.tolerance));
}

/** Ifoda: tasodifiy nuqtalarda ekvivalentlik (T-074). O'qilmasa yoki ustoz "qo'lda" desa MANUAL (BR-Q03) */
function expression(q: Of<"EXPRESSION">, raw: unknown): CheckResult {
  const r = responseSchemas.EXPRESSION.safeParse(raw);
  if (!r.success) return "WRONG";
  if (q.answer.manual) return "MANUAL";
  const eq = expressionsEqual(r.data.value, q.answer.value);
  return eq === null ? "MANUAL" : verdict(eq);
}

/** Moslashtirish: barcha juftlar to'g'ri bo'lsagina to'g'ri (BR-M03) */
function matching(q: Of<"MATCHING">, raw: unknown) {
  const r = responseSchemas.MATCHING.safeParse(raw);
  if (!r.success) return "WRONG";
  const want = Object.entries(q.answer.pairs);
  const given = r.data.pairs;
  return verdict(Object.keys(given).length === want.length && want.every(([l, rt]) => given[l] === rt));
}

/**
 * O'quvchi javobini avtomatik tekshiradi. Noto'g'ri shakldagi javob WRONG.
 * EXPRESSION ekvivalentlik bo'yicha (T-074, ADR-0003), o'qilmasa MANUAL. WRITTEN doim MANUAL.
 */
export function checkAnswer(q: QuestionInput, raw: unknown): CheckResult {
  switch (q.type) {
    case "SINGLE":
      return single(q, raw);
    case "MULTIPLE":
      return multiple(q, raw);
    case "NUMERIC":
      return numeric(q, raw);
    case "MATCHING":
      return matching(q, raw);
    case "EXPRESSION":
      return expression(q, raw);
    default:
      return "MANUAL";
  }
}
