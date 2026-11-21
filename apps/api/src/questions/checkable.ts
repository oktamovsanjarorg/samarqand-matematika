import { parseExpression, parseNumber } from "@samarqand/math";
import type { QuestionInput } from "@samarqand/shared";

export interface CheckIssue {
  path: "answer.value" | "answer.tolerance";
  message: string;
}

/** Son javobi, chegarasi va ifoda (T-074) o'qiladigan bo'lishi shart: aks holda hech kim to'g'ri javob bera olmaydi */
export function checkIssue(q: QuestionInput): CheckIssue | null {
  if (q.type === "EXPRESSION" && !q.answer.manual && !parseExpression(q.answer.value))
    return { path: "answer.value", message: "ifoda sifatida oʻqilmadi" };
  if (q.type !== "NUMERIC") return null;
  if (!parseNumber(q.answer.value)) return { path: "answer.value", message: "son sifatida oʻqilmadi" };
  if (q.answer.tolerance !== undefined && !parseNumber(q.answer.tolerance))
    return { path: "answer.tolerance", message: "son sifatida oʻqilmadi" };
  return null;
}
