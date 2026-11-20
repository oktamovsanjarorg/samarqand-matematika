import { Prisma, type Question } from "@samarqand/db";
import {
  questionInput,
  type AdminQuestionDetail,
  type QuestionInput,
  type QuestionView,
} from "@samarqand/shared";

/** O'quvchi ko'radigan qism: variantlar yoki ustunlar. To'g'ri javob bu yerga tushmaydi */
function contentOf(q: QuestionInput): Prisma.InputJsonObject {
  if (q.type === "SINGLE" || q.type === "MULTIPLE") return { options: q.options };
  if (q.type === "MATCHING") return { left: q.left, right: q.right };
  return {};
}

/** Kiritilgan savolni baza ustunlariga ajratadi: content (ko'rinadigan) va answer (yashirin) */
export function toStorage(q: QuestionInput) {
  return {
    type: q.type,
    text: q.text,
    solution: q.solution ?? "",
    difficulty: q.difficulty ?? 2,
    skills: q.skills ?? [],
    isPublished: q.isPublished ?? false,
    content: contentOf(q),
    answer: "answer" in q ? (q.answer as Prisma.InputJsonObject) : Prisma.DbNull,
  };
}

const asObject = (v: Prisma.JsonValue): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? v : {};

/** Bazadagi yozuvni qayta to'liq savolga yig'adi (faqat admin uchun: javob bilan) */
export function toDetail(row: Question): AdminQuestionDetail {
  const parsed = questionInput.parse({
    type: row.type,
    text: row.text,
    solution: row.solution,
    difficulty: row.difficulty,
    skills: row.skills,
    isPublished: row.isPublished,
    ...asObject(row.content),
    ...(row.answer === null ? {} : { answer: row.answer }),
  });
  return { ...parsed, id: row.id, topicId: row.topicId, order: row.order };
}

/** O'quvchiga yuboriladigan ko'rinish: faqat id, tur, matn va content. answer va solution olinmaydi */
export function toView(row: Pick<Question, "id" | "type" | "text" | "content">): QuestionView {
  const content = asObject(row.content);
  return { id: row.id, type: row.type, text: row.text, ...(content as Partial<QuestionView>) };
}

/** O'quvchi ko'rinishi uchun select: javob ustunlari hech qachon o'qilmaydi */
export const VIEW_SELECT = { id: true, type: true, text: true, content: true } as const;
