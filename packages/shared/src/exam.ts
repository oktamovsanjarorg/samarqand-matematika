import { z } from "zod";
import { QUESTION_TYPES } from "./question";

/** Imtihon shabloni (BR-M01): Mock tuzilmasi kodda emas, shu sozlamada turadi */
export const examSection = z.object({
  title: z.string().trim().min(1, "Boʻlim nomi kerak").max(100),
  types: z
    .array(z.enum(QUESTION_TYPES))
    .min(1, "Kamida bitta savol turi")
    .refine((t) => new Set(t).size === t.length, "Savol turi takrorlangan"),
  count: z.number().int().min(1, "Kamida 1 ta savol").max(100),
  /** Bitta savol bali (xom ball) */
  points: z.number().positive("Ball musbat boʻlsin").max(100),
});
export type ExamSection = z.infer<typeof examSection>;

export const examGrade = z.object({
  label: z.string().trim().min(1, "Daraja nomi kerak").max(8),
  /** Shkaladagi eng kichik ball (shu va undan yuqori) */
  min: z.number().min(0),
});
export type ExamGrade = z.infer<typeof examGrade>;

export const examTemplateInput = z
  .object({
    name: z.string().trim().min(1, "Nom kerak").max(120),
    durationMin: z.number().int().min(5, "Kamida 5 daqiqa").max(600),
    /** Natija shkalasi (Milliy sertifikat: 75) */
    scaleMax: z.number().positive().max(1000),
    sections: z.array(examSection).min(1, "Kamida bitta boʻlim").max(20),
    grades: z.array(examGrade).max(20),
  })
  .superRefine((t, ctx) => {
    t.grades.forEach((g, i) => {
      if (g.min > t.scaleMax)
        ctx.addIssue({ code: "custom", path: ["grades", i, "min"], message: "Shkaladan katta" });
      const prev = t.grades[i - 1];
      if (prev && g.min >= prev.min)
        ctx.addIssue({ code: "custom", path: ["grades", i, "min"], message: "Darajalar kamayish tartibida" });
    });
  });
export type ExamTemplateInput = z.infer<typeof examTemplateInput>;

export const examTemplatePatch = z.object({ isActive: z.boolean() });

export interface ExamTemplate extends ExamTemplateInput {
  id: string;
  isActive: boolean;
}

export const examQuestionCount = (sections: ExamSection[]) => sections.reduce((n, s) => n + s.count, 0);

/** Eng yuqori xom ball */
export const examMaxRaw = (sections: ExamSection[]) =>
  Math.round(sections.reduce((n, s) => n + s.count * s.points, 0) * 100) / 100;

/** Taxminiy shkala balli: xom ball ulushi × shkala (BR-M05). Rasch ishlatilmaganda */
export const approxScaled = (raw: number, maxRaw: number, scaleMax: number) =>
  maxRaw > 0 ? Math.round((raw / maxRaw) * scaleMax * 10) / 10 : 0;

/** Daraja: chegarasi ball bilan teng yoki undan kichik birinchi daraja. Hech biri bo'lmasa null */
export const gradeOf = (score: number, grades: ExamGrade[]) =>
  grades.find((g) => score >= g.min)?.label ?? null;

/**
 * "Milliy sertifikat" taklifi: PLAN §5.2.1 dagi ikkilamchi ma'lumot (Q-09).
 * Rasmiy UzBMB spetsifikatsiyasi kelguncha ustoz o'zi tahrirlaydi.
 */
export const MILLIY_PRESET: ExamTemplateInput = {
  name: "Milliy sertifikat (matematika)",
  durationMin: 150,
  scaleMax: 75,
  sections: [
    { title: "Yopiq, bitta javob (oson)", types: ["SINGLE"], count: 15, points: 1.3 },
    { title: "Yopiq, bitta javob (oʻrta)", types: ["SINGLE"], count: 15, points: 2.2 },
    { title: "Moslashtirish", types: ["MATCHING"], count: 5, points: 3.2 },
    { title: "Ochiq javob", types: ["NUMERIC", "EXPRESSION"], count: 10, points: 3.2 },
  ],
  grades: [
    { label: "A+", min: 70 },
    { label: "A", min: 65 },
    { label: "B+", min: 60 },
    { label: "B", min: 55 },
    { label: "C+", min: 50 },
    { label: "C", min: 46 },
  ],
};
