import { z } from "zod";

const title = z.string().trim().min(1, "Nom kerak").max(200);

export const courseInput = z.object({
  title,
  description: z.string().trim().max(2000).nullable().optional(),
  isPublished: z.boolean().optional(),
});
export type CourseInput = z.infer<typeof courseInput>;

export const topicInput = z.object({ title });
export type TopicInput = z.infer<typeof topicInput>;

export const lessonInput = z.object({
  title,
  body: z.string().max(50_000).optional(),
  videoUrl: z.string().trim().url("Havola notoʻgʻri").max(500).nullable().optional(),
  isFree: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});
export type LessonInput = z.infer<typeof lessonInput>;

/** Ota (kurslar ro'yxati, kurs ichidagi mavzular, mavzu ichidagi darslar yoki savollar) ichida yangi tartib: hamma id'lar, yangi ketma-ketlikda */
export const reorderBody = z.object({
  kind: z.enum(["course", "topic", "lesson", "question"]),
  ids: z.array(z.string().min(1)).min(1).max(500),
});
export type ReorderBody = z.infer<typeof reorderBody>;

// ---------- Admin ko'rinishi ----------

export interface AdminLessonRow {
  id: string;
  title: string;
  order: number;
  isFree: boolean;
  isPublished: boolean;
}

export interface AdminTopicRow {
  id: string;
  title: string;
  order: number;
  lessons: AdminLessonRow[];
}

export interface AdminCourseTree {
  id: string;
  title: string;
  description: string | null;
  order: number;
  isPublished: boolean;
  topics: AdminTopicRow[];
}

export interface AdminLessonDetail extends AdminLessonRow {
  topicId: string;
  body: string;
  videoUrl: string | null;
  updatedAt: string;
}

// ---------- O'quvchi ko'rinishi ----------

export interface CourseView {
  id: string;
  title: string;
  description: string | null;
  topics: {
    id: string;
    title: string;
    /** Nashr qilingan savollar soni: 0 bo'lsa mavzu testi yo'q */
    questionCount: number;
    lessons: { id: string; title: string; isFree: boolean; locked: boolean }[];
  }[];
}

export interface LessonView {
  id: string;
  title: string;
  topicTitle: string;
  courseTitle: string;
  body: string;
  videoUrl: string | null;
  isFree: boolean;
}
