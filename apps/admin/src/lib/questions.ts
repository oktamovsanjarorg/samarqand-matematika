import { questionInput, type Choice, type QuestionInput, type QuestionType } from "@samarqand/shared";

export const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE: "Bitta javob",
  MULTIPLE: "Bir nechta javob",
  NUMERIC: "Son javob",
  EXPRESSION: "Ifoda javob",
  MATCHING: "Moslashtirish",
  WRITTEN: "Yozma (ustoz tekshiradi)",
};

export const DIFFICULTY_LABELS: Record<number, string> = { 1: "Oson", 2: "Oʻrta", 3: "Qiyin" };

const KEYS = "abcdefghij";
/** n-chi variant kaliti: a, b, c ... */
export const keyAt = (i: number) => KEYS[i] ?? String(i);
export const choices = (n: number, from = 0): Choice[] =>
  Array.from({ length: n }, (_, i) => ({ id: keyAt(i + from), text: "" }));

type Common = Pick<QuestionInput, "text" | "solution" | "difficulty" | "skills" | "isPublished">;

/** Tur almashganda umumiy maydonlar saqlanadi, turga xos qism yangidan boshlanadi */
export function draftOf(type: QuestionType, c: Common): QuestionInput {
  switch (type) {
    case "SINGLE":
      return { ...c, type, options: choices(4), answer: { optionId: "a" } };
    case "MULTIPLE":
      return { ...c, type, options: choices(4), answer: { optionIds: [] } };
    case "NUMERIC":
      return { ...c, type, answer: { value: "" } };
    case "EXPRESSION":
      return { ...c, type, answer: { value: "" } };
    case "MATCHING":
      return {
        ...c,
        type,
        left: choices(3),
        right: choices(3, 3).map((r, i) => ({ ...r, id: String(i + 1) })),
        answer: { pairs: {} },
      };
    default:
      return { ...c, type: "WRITTEN" };
  }
}

export const emptyQuestion = (): QuestionInput =>
  draftOf("SINGLE", { text: "", solution: "", difficulty: 2, skills: [], isPublished: false });

/** Tur o'zgarganda umumiy maydonlarni ko'chirish */
export const commonOf = (q: QuestionInput): Common => ({
  text: q.text,
  solution: q.solution ?? "",
  difficulty: q.difficulty ?? 2,
  skills: q.skills ?? [],
  isPublished: q.isPublished ?? false,
});

const PLACES: Record<string, (i: number) => string> = {
  options: (i) => `${keyAt(i).toUpperCase()} variant`,
  left: (i) => `Chap ${keyAt(i).toUpperCase()}`,
  right: (i) => `Oʻng ${i + 1}`,
};

/** Saqlashdan oldin tekshiruv: xato bo'lsa ustozga tushunarli matn, bo'lmasa null */
export function validationError(q: QuestionInput): string | null {
  const r = questionInput.safeParse(q);
  if (r.success) return null;
  const issue = r.error.issues[0];
  if (!issue) return null;
  const [field, index] = issue.path;
  const place = typeof field === "string" && typeof index === "number" ? PLACES[field]?.(index) : undefined;
  return place ? `${place}: ${issue.message}` : issue.message;
}
