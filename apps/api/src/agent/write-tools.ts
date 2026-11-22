import { toCsv, type BroadcastResult, type QuestionImportResult } from "@samarqand/shared";
import { z } from "zod";
import { id, q, tool } from "./agent-tool";

const iso = z.iso.datetime({ offset: true });
const OPTIONS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

const questionRow = z.object({
  type: z.enum(["bitta", "bir nechta", "son", "ifoda", "yozma"]),
  text: z.string().min(1).max(4000),
  options: z.array(z.string().max(500)).max(8).optional(),
  answer: z.string().max(500).optional(),
  solution: z.string().max(4000).optional(),
  difficulty: z.enum(["oson", "orta", "qiyin"]).optional(),
  tags: z.string().max(200).optional(),
});
type QuestionRow = z.infer<typeof questionRow>;

/** Agent yozgan savollar → import CSV (T-100): o'sha tekshiruv, qoralama sifatida */
export function questionsCsv(rows: QuestionRow[]): string {
  const head = ["Tur", "Savol", ...OPTIONS, "Javob", "Yechim", "Qiyinlik", "Teglar"];
  const body = rows.map((r) => [
    r.type,
    r.text,
    ...OPTIONS.map((_, i) => r.options?.[i] ?? null),
    r.answer ?? null,
    r.solution ?? null,
    r.difficulty ?? null,
    r.tags ?? null,
  ]);
  return toCsv([head, ...body]);
}

const importPreview = (p: unknown) => p as QuestionImportResult;

/** Yozish asboblari: ustoz tasdiqlagach bajariladi */
export const WRITE_TOOLS = [
  tool({
    name: "create_course",
    description: "Yangi kurs yaratish (nashr qilinmagan).",
    schema: z.object({ title: z.string().min(2).max(200) }),
    write: true,
    title: (i) => `Kurs yaratish: ${i.title}`,
    request: (i) => ({ method: "POST", path: "/admin/courses", body: { title: i.title } }),
  }),
  tool({
    name: "create_topic",
    description: "Kursga mavzu qo'shish. courseId content_tree dan.",
    schema: z.object({ courseId: id, title: z.string().min(2).max(200) }),
    write: true,
    title: (i) => `Mavzu qoʻshish: ${i.title}`,
    request: (i) => ({
      method: "POST",
      path: `/admin/courses/${q(i.courseId)}/topics`,
      body: { title: i.title },
    }),
  }),
  tool({
    name: "create_lesson",
    description:
      "Mavzuga dars (konspekt) qo'shish, qoralama. body Markdown, formulalar LaTeX: $x^2$, $$\\frac{a}{b}$$.",
    schema: z.object({ topicId: id, title: z.string().min(2).max(200), body: z.string().max(20000) }),
    write: true,
    title: (i) => `Dars qoʻshish: ${i.title}`,
    request: (i) => ({
      method: "POST",
      path: `/admin/topics/${q(i.topicId)}/lessons`,
      body: { title: i.title, body: i.body },
    }),
    lines: (i) => [i.body.slice(0, 300) + (i.body.length > 300 ? "…" : "")],
  }),
  tool({
    name: "add_questions",
    description:
      "Mavzuga savollar qo'shish (qoralama, ustoz keyin nashr qiladi). type: bitta (bitta to'g'ri variant, answer = harf, masalan B), bir nechta (answer = 'A, C'), son (answer = son yoki kasr: 3/4, 0,5), ifoda (answer = ifoda, masalan 2x+2), yozma (answer yo'q, ustoz tekshiradi). Formulalar LaTeX: $...$. Bir chaqiruvda 50 tagacha.",
    schema: z.object({ topicId: id, questions: z.array(questionRow).min(1).max(50) }),
    write: true,
    title: (i) => `${i.questions.length} ta savol qoʻshish (qoralama)`,
    preview: (i) => ({
      method: "POST",
      path: `/admin/topics/${q(i.topicId)}/questions/import`,
      body: { csv: questionsCsv(i.questions), dryRun: true },
    }),
    request: (i) => ({
      method: "POST",
      path: `/admin/topics/${q(i.topicId)}/questions/import`,
      body: { csv: questionsCsv(i.questions), dryRun: false },
    }),
    // Bitta qator xato bo'lsa import hech narsa saqlamaydi: agent tuzatsin (2-qator = 1-savol)
    invalid: (p) =>
      importPreview(p).errors.length
        ? `Savollarda xato (qator raqami: 2-qator = 1-savol): ${importPreview(p)
            .errors.map((e) => `${e.line}-qator: ${e.message}`)
            .join("; ")}`
        : null,
    lines: (i, p) => [
      `${importPreview(p).ready.length} ta savol tekshiruvdan oʻtdi`,
      ...i.questions.slice(0, 5).map((x, n) => `${n + 1}. ${x.text.slice(0, 120)}`),
    ],
  }),
  tool({
    name: "create_weekly_test",
    description:
      "Haftalik test yaratish. questionIds — nashr qilingan savollar id lari (list_questions dan). Vaqtlar ISO 8601, Toshkent vaqti +05:00 bilan. isPublished=true bo'lsa o'quvchilarga ochilganda xabar boradi.",
    schema: z.object({
      title: z.string().min(2).max(120),
      opensAt: iso,
      closesAt: iso,
      questionIds: z.array(id).min(1).max(60),
      isPublished: z.boolean(),
    }),
    write: true,
    title: (i) => `Haftalik test: ${i.title}`,
    request: (i) => ({ method: "POST", path: "/admin/weekly", body: i }),
    lines: (i) => [
      `${i.questionIds.length} ta savol`,
      `Ochiladi: ${i.opensAt}`,
      `Yopiladi: ${i.closesAt}`,
      i.isPublished ? "Nashr qilinadi" : "Qoralama",
    ],
  }),
  tool({
    name: "accept_student",
    description: "Yangi o'quvchini qabul qilish (o'quvchiga xabar boradi).",
    schema: z.object({ studentId: id, name: z.string().max(200) }),
    write: true,
    title: (i) => `Oʻquvchini qabul qilish: ${i.name}`,
    request: (i) => ({ method: "POST", path: `/admin/students/${q(i.studentId)}/accept`, body: {} }),
  }),
  tool({
    name: "approve_payment",
    description: "To'lov chekini tasdiqlash (obuna uzayadi). Avval list_payments bilan chekni ko'ring.",
    schema: z.object({ paymentId: id, student: z.string().max(200) }),
    write: true,
    title: (i) => `Toʻlovni tasdiqlash: ${i.student}`,
    request: (i) => ({ method: "POST", path: `/admin/payments/${q(i.paymentId)}/approve`, body: {} }),
  }),
  tool({
    name: "reject_payment",
    description: "To'lov chekini rad etish, sabab bilan (o'quvchiga boradi).",
    schema: z.object({ paymentId: id, student: z.string().max(200), reason: z.string().min(3).max(300) }),
    write: true,
    title: (i) => `Toʻlovni rad etish: ${i.student}`,
    request: (i) => ({
      method: "POST",
      path: `/admin/payments/${q(i.paymentId)}/reject`,
      body: { reason: i.reason },
    }),
    lines: (i) => [`Sabab: ${i.reason}`],
  }),
  tool({
    name: "send_broadcast",
    description:
      "E'lon yuborish (faqat ustoz). audience: students — qabul qilingan o'quvchilar, parents — tasdiqlangan ota-onalar, all — ikkalasi, unlinked — ota-onasi ulanmagan o'quvchilar. groupId null — hammaga.",
    schema: z.object({
      text: z.string().min(1).max(2000),
      audience: z.enum(["students", "parents", "all", "unlinked"]),
      groupId: id.nullable(),
    }),
    write: true,
    title: () => "Eʼlon yuborish",
    preview: (i) => ({ method: "POST", path: "/admin/broadcast", body: { ...i, dryRun: true } }),
    request: (i) => ({ method: "POST", path: "/admin/broadcast", body: { ...i, dryRun: false } }),
    lines: (i, p) => [`${(p as BroadcastResult).recipients} kishiga boradi`, i.text],
  }),
  tool({
    name: "create_group",
    description: "Offline guruh yaratish.",
    schema: z.object({ name: z.string().min(2).max(80) }),
    write: true,
    title: (i) => `Guruh yaratish: ${i.name}`,
    request: (i) => ({ method: "POST", path: "/admin/groups", body: { name: i.name } }),
  }),
  tool({
    name: "add_to_group",
    description: "O'quvchilarni guruhga qo'shish. userIds — find_students dagi id lar.",
    schema: z.object({
      groupId: id,
      userIds: z.array(id).min(1).max(100),
      names: z.array(z.string().max(200)).max(100),
    }),
    write: true,
    title: (i) => `Guruhga ${i.userIds.length} ta oʻquvchi qoʻshish`,
    request: (i) => ({
      method: "POST",
      path: `/admin/groups/${q(i.groupId)}/students`,
      body: { userIds: i.userIds },
    }),
    lines: (i) => i.names.slice(0, 10),
  }),
];
