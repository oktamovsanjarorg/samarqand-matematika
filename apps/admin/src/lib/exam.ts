import { examTemplateInput, type ExamTemplateInput, type QuestionType } from "@samarqand/shared";

/** Forma holati: sonlar matn ko'rinishida, kiritish paytida buzilmasin */
export interface SectionDraft {
  title: string;
  types: QuestionType[];
  count: string;
  points: string;
}
export interface GradeDraft {
  label: string;
  min: string;
}
export interface TemplateDraft {
  name: string;
  durationMin: string;
  scaleMax: string;
  sections: SectionDraft[];
  grades: GradeDraft[];
}

const num = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : Number.NaN);

export const emptySection = (): SectionDraft => ({ title: "", types: ["SINGLE"], count: "10", points: "1" });

export const toDraft = (t: ExamTemplateInput): TemplateDraft => ({
  name: t.name,
  durationMin: String(t.durationMin),
  scaleMax: String(t.scaleMax),
  sections: t.sections.map((s) => ({ ...s, count: String(s.count), points: String(s.points) })),
  grades: t.grades.map((g) => ({ label: g.label, min: String(g.min) })),
});

export const EMPTY_DRAFT: TemplateDraft = {
  name: "",
  durationMin: "90",
  scaleMax: "100",
  sections: [emptySection()],
  grades: [],
};

const FIELD_NAMES: Record<string, string> = {
  name: "Nom",
  durationMin: "Vaqt",
  scaleMax: "Shkala",
  sections: "Boʻlim",
  grades: "Daraja",
};

/** Formani tekshirish: birinchi xato odam o'qiydigan ko'rinishda ("2-boʻlim: ...") */
export function parseDraft(d: TemplateDraft): { input: ExamTemplateInput } | { error: string } {
  const parsed = examTemplateInput.safeParse({
    name: d.name,
    durationMin: num(d.durationMin),
    scaleMax: num(d.scaleMax),
    sections: d.sections.map((s) => ({ ...s, count: num(s.count), points: num(s.points) })),
    grades: d.grades.map((g) => ({ label: g.label, min: num(g.min) })),
  });
  if (parsed.success) return { input: parsed.data };
  const issue = parsed.error.issues[0];
  const [field, index] = issue?.path ?? [];
  const where = FIELD_NAMES[String(field)] ?? "";
  const message = issue?.code === "invalid_type" ? "son kiriting" : (issue?.message ?? "Xato");
  if (typeof index === "number") return { error: `${index + 1}-${where.toLowerCase()}: ${message}` };
  return { error: issue?.code === "invalid_type" ? `${where}: ${message}` : message };
}
