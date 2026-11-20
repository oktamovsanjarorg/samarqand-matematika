import { z } from "zod";

export const QUESTION_TYPES = ["SINGLE", "MULTIPLE", "NUMERIC", "EXPRESSION", "MATCHING", "WRITTEN"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Variant yoki ustun elementi kaliti: "a", "b", "1" ... */
const key = z.string().regex(/^[a-z0-9]{1,8}$/, "Kalit: kichik lotin harfi yoki raqam");
const choice = z.object({ id: key, text: z.string().trim().min(1, "Matn kerak").max(2000) });
export type Choice = z.infer<typeof choice>;
const choices = (max: number) => z.array(choice).min(2, "Kamida 2 ta variant").max(max);
const numberText = z.string().trim().min(1, "Javob kerak").max(64);

const common = {
  text: z.string().trim().min(1, "Savol matni kerak").max(20_000),
  solution: z.string().max(20_000).optional(),
  difficulty: z.int().min(1).max(3).optional(),
  skills: z
    .array(z.string().regex(/^[a-z0-9-]{2,40}$/, "Teg: kichik harf, raqam va chiziqcha"))
    .max(10)
    .optional(),
  isPublished: z.boolean().optional(),
};

const single = z.object({
  ...common,
  type: z.literal("SINGLE"),
  options: choices(8),
  answer: z.object({ optionId: key }),
});
const multiple = z.object({
  ...common,
  type: z.literal("MULTIPLE"),
  options: choices(8),
  answer: z.object({ optionIds: z.array(key).min(1) }),
});
const numeric = z.object({
  ...common,
  type: z.literal("NUMERIC"),
  answer: z.object({ value: numberText, tolerance: numberText.optional() }),
});
const expression = z.object({
  ...common,
  type: z.literal("EXPRESSION"),
  answer: z.object({ value: z.string().trim().min(1, "Javob kerak").max(500) }),
});
const matching = z.object({
  ...common,
  type: z.literal("MATCHING"),
  left: choices(8),
  right: choices(10),
  answer: z.object({ pairs: z.record(key, key) }),
});
const written = z.object({ ...common, type: z.literal("WRITTEN") });

const unique = (items: { id: string }[]) => new Set(items.map((i) => i.id)).size === items.length;

type Draft = z.infer<typeof questionDraft>;
const questionDraft = z.discriminatedUnion("type", [
  single,
  multiple,
  numeric,
  expression,
  matching,
  written,
]);

/** Javob savolning o'z variantlariga ishora qilishini tekshiradi. Xato bo'lsa matn, bo'lmasa null */
function consistencyError(q: Draft): string | null {
  if (q.type === "SINGLE" || q.type === "MULTIPLE") {
    if (!unique(q.options)) return "Variant kalitlari takrorlangan";
    const ids = new Set(q.options.map((o) => o.id));
    const picked = q.type === "SINGLE" ? [q.answer.optionId] : q.answer.optionIds;
    if (new Set(picked).size !== picked.length) return "Javobda variant takrorlangan";
    return picked.every((id) => ids.has(id)) ? null : "Javob variantlar ichida yoʻq";
  }
  if (q.type === "MATCHING") {
    if (!unique(q.left) || !unique(q.right)) return "Ustun kalitlari takrorlangan";
    const right = new Set(q.right.map((r) => r.id));
    const pairs = q.answer.pairs;
    const complete = q.left.every((l) => right.has(pairs[l.id] ?? ""));
    return complete && Object.keys(pairs).length === q.left.length
      ? null
      : "Har chap element uchun juft kerak";
  }
  return null;
}

/** Ustoz yaratadigan yoki to'liq almashtiradigan savol (PUT) */
export const questionInput = questionDraft.superRefine((q, ctx) => {
  const error = consistencyError(q);
  if (error) ctx.addIssue({ code: "custom", message: error, path: ["answer"] });
});
export type QuestionInput = z.infer<typeof questionInput>;

/** O'quvchi javobi: savol turiga qarab tekshiriladi */
export const responseSchemas = {
  SINGLE: z.object({ optionId: key }),
  MULTIPLE: z.object({ optionIds: z.array(key).max(8) }),
  NUMERIC: z.object({ value: z.string().max(64) }),
  EXPRESSION: z.object({ value: z.string().max(500) }),
  MATCHING: z.object({ pairs: z.record(key, key) }),
  WRITTEN: z.object({ text: z.string().max(5000).optional() }),
} as const;
export type QuestionResponse = { [T in QuestionType]: z.infer<(typeof responseSchemas)[T]> };

/** Avtomatik tekshiruv natijasi. MANUAL: ustoz baholaydi */
export type CheckResult = "CORRECT" | "WRONG" | "MANUAL";

// ---------- Ko'rinishlar ----------

export interface AdminQuestionRow {
  id: string;
  type: QuestionType;
  text: string;
  difficulty: number;
  skills: string[];
  order: number;
  isPublished: boolean;
}

export type AdminQuestionDetail = QuestionInput & { id: string; topicId: string; order: number };

/** O'quvchiga yuboriladigan savol: to'g'ri javob va yechim yo'q */
export interface QuestionView {
  id: string;
  type: QuestionType;
  text: string;
  options?: Choice[];
  left?: Choice[];
  right?: Choice[];
}
