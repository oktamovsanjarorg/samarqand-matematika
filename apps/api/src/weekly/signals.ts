import type { CheckResult } from "@samarqand/shared";

export interface AnswerRow {
  userId: string;
  questionId: string;
  response: unknown;
  result: CheckResult | null;
}

/** Kalitlar va massivlar tartibidan qat'i nazar bir xil javob bir xil satr bo'ladi */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).sort().join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${k}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(typeof v === "string" ? v.trim().toLowerCase() : v);
}

/**
 * O'quvchilar orasidagi o'xshashlik (PLAN §6): bir savolga aynan bir xil NOTO'G'RI javob bergan
 * kamida ikki o'quvchi. To'g'ri javobning bir xilligi signal emas. Natija: savol → guruhlar (userId)
 */
export function sameWrongAnswers(rows: AnswerRow[]): Map<string, string[][]> {
  const groups = new Map<string, Map<string, string[]>>();
  for (const r of rows) {
    if (r.result !== "WRONG" || r.response === null || r.response === undefined) continue;
    const byAnswer = groups.get(r.questionId) ?? new Map<string, string[]>();
    const key = canonical(r.response);
    byAnswer.set(key, [...(byAnswer.get(key) ?? []), r.userId]);
    groups.set(r.questionId, byAnswer);
  }
  const out = new Map<string, string[][]>();
  for (const [qid, byAnswer] of groups) {
    const same = [...byAnswer.values()].filter((users) => users.length >= 2);
    if (same.length) out.set(qid, same);
  }
  return out;
}

/** O'z tarixidan keskin farq: mavzu testlarida o'rtacha <50%, haftalikda ≥90% (PLAN §6) */
export const historyJump = (topicAvgPercent: number | null, weeklyPercent: number) =>
  topicAvgPercent !== null && topicAvgPercent < 50 && weeklyPercent >= 90;
