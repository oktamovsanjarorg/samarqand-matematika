import { z } from "zod";
import type { ExamTemplateInput } from "./exam";
import type { WeeklyQuestionRow, WeeklyStatus } from "./weekly";

const iso = z.iso.datetime({ offset: true });

/** Mock: shablon bo'limlariga savollar (har bo'limda shablondagi soni va turlari, T-051) */
export const mockTestInput = z
  .object({
    title: z.string().trim().min(2, "Nom kamida 2 belgi").max(120),
    templateId: z.string().min(1, "Shablon tanlang"),
    opensAt: iso,
    closesAt: iso,
    sections: z
      .array(z.array(z.string().min(1)))
      .min(1)
      .max(20),
    isPublished: z.boolean().optional(),
  })
  .refine((v) => new Date(v.closesAt) > new Date(v.opensAt), {
    message: "Yopilish ochilishdan keyin boʻlsin",
    path: ["closesAt"],
  })
  .refine((v) => new Set(v.sections.flat()).size === v.sections.flat().length, {
    message: "Savol takrorlangan",
    path: ["sections"],
  });
export type MockTestInput = z.infer<typeof mockTestInput>;

export interface AdminMockRow {
  id: string;
  title: string;
  templateName: string;
  opensAt: string;
  closesAt: string;
  isPublished: boolean;
  status: WeeklyStatus;
  questionCount: number;
  submitted: number;
}

export interface AdminMockDetail extends AdminMockRow {
  templateId: string | null;
  /** Mock yaratilgandagi shablon nusxasi */
  template: ExamTemplateInput;
  sections: WeeklyQuestionRow[][];
}
