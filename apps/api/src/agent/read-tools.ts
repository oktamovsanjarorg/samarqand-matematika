import { statsMonth } from "@samarqand/shared";
import { z } from "zod";
import { id, q, tool } from "./agent-tool";

const none = z.object({});

/** O'qish asboblari: darhol bajariladi */
export const READ_TOOLS = [
  tool({
    name: "dashboard",
    description:
      "Bosh sahifa: kutayotgan ishlar (qabul qilinmagan o'quvchilar, tekshirilmagan cheklar va javoblar), e'tibor kerak o'quvchilar, umumiy sonlar.",
    schema: none,
    write: false,
    title: () => "Bosh sahifani koʻrish",
    request: () => ({ method: "GET", path: "/admin/dashboard" }),
  }),
  tool({
    name: "find_students",
    description:
      "O'quvchilarni qidirish (ism, username yoki telefon bo'yicha). filter: all — hammasi, new — qabul qilinmaganlar, unpaid — to'lamaganlar, expiring — obunasi tugayotganlar.",
    schema: z.object({
      query: z.string().max(100).optional(),
      filter: z.enum(["all", "new", "unpaid", "expiring"]).default("all"),
    }),
    write: false,
    title: (i) => `Oʻquvchilarni qidirish${i.query ? `: ${i.query}` : ""}`,
    request: (i) => ({ method: "GET", path: `/admin/students?filter=${i.filter}&q=${q(i.query ?? "")}` }),
  }),
  tool({
    name: "student_card",
    description:
      "Bitta o'quvchi kartasi: natijalar, haftalik va mock, to'lovlar, ota-ona. studentId find_students dan olinadi.",
    schema: z.object({ studentId: id }),
    write: false,
    title: () => "Oʻquvchi kartasini koʻrish",
    request: (i) => ({ method: "GET", path: `/admin/students/${q(i.studentId)}` }),
  }),
  tool({
    name: "content_tree",
    description:
      "Kurslar, ularning mavzulari va darslari (id lari bilan). Savol yoki dars qo'shishdan oldin mavzu id sini shu yerdan oling.",
    schema: none,
    write: false,
    title: () => "Kurs va mavzularni koʻrish",
    request: () => ({ method: "GET", path: "/admin/courses" }),
  }),
  tool({
    name: "list_questions",
    description: "Mavzudagi savollar (id, tur, matn, nashr holati).",
    schema: z.object({ topicId: id }),
    write: false,
    title: () => "Mavzu savollarini koʻrish",
    request: (i) => ({ method: "GET", path: `/admin/topics/${q(i.topicId)}/questions` }),
  }),
  tool({
    name: "search_questions",
    description: "Savollar bankidan matn bo'yicha qidirish (barcha mavzular).",
    schema: z.object({ query: z.string().min(2).max(100) }),
    write: false,
    title: (i) => `Savol qidirish: ${i.query}`,
    request: (i) => ({ method: "GET", path: `/admin/questions?q=${q(i.query)}` }),
  }),
  tool({
    name: "list_weekly_tests",
    description: "Haftalik testlar ro'yxati (ochilish/yopilish vaqti, holati).",
    schema: none,
    write: false,
    title: () => "Haftalik testlarni koʻrish",
    request: () => ({ method: "GET", path: "/admin/weekly" }),
  }),
  tool({
    name: "weekly_standings",
    description: "Haftalik test natijalari: kim topshirdi, ball, reyting.",
    schema: z.object({ weeklyId: id }),
    write: false,
    title: () => "Haftalik test natijalarini koʻrish",
    request: (i) => ({ method: "GET", path: `/admin/weekly/${q(i.weeklyId)}/standings` }),
  }),
  tool({
    name: "list_payments",
    description: "To'lov cheklari: PENDING — tekshirilmagan, APPROVED, REJECTED.",
    schema: z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING") }),
    write: false,
    title: () => "Toʻlovlarni koʻrish",
    request: (i) => ({ method: "GET", path: `/admin/payments?status=${i.status}` }),
  }),
  tool({
    name: "list_groups",
    description: "Offline guruhlar va a'zolar soni.",
    schema: none,
    write: false,
    title: () => "Guruhlarni koʻrish",
    request: () => ({ method: "GET", path: "/admin/groups" }),
  }),
  tool({
    name: "group_detail",
    description:
      "Bitta guruh: a'zolari (userId, ism). Davomat belgilashdan oldin a'zolar id sini shu yerdan oling.",
    schema: z.object({ groupId: id }),
    write: false,
    title: () => "Guruhni koʻrish",
    request: (i) => ({ method: "GET", path: `/admin/groups/${q(i.groupId)}` }),
  }),
  tool({
    name: "group_attendance_month",
    description: "Guruhning oylik davomat jadvali: kunlar va har o'quvchining holati. month: YYYY-MM.",
    schema: z.object({ groupId: id, month: statsMonth }),
    write: false,
    title: (i) => `Davomat jadvali: ${i.month}`,
    request: (i) => ({
      method: "GET",
      path: `/admin/groups/${q(i.groupId)}/attendance/month?month=${i.month}`,
    }),
  }),
  // T-164: statistika va maslahatlar
  tool({
    name: "month_stats",
    description:
      "Oy statistikasi: o'quvchilar soni va faollari, davomat foizi (guruhlar bo'yicha), mavzu testlarida to'g'ri foiz, haftalik o'rtacha ball, eng yaxshi 5 o'quvchi, oxirgi 8 hafta faolligi. month: YYYY-MM, bo'lmasa joriy oy.",
    schema: z.object({ month: statsMonth.optional() }),
    write: false,
    title: (i) => `Statistika${i.month ? `: ${i.month}` : ""}`,
    request: (i) => ({ method: "GET", path: `/admin/stats${i.month ? `?month=${i.month}` : ""}` }),
  }),
  tool({
    name: "advice",
    description:
      "Maslahatchi: faktlarga asoslangan tavsiyalar (sinf qiynalayotgan mavzu, rejalashtirilmagan haftalik test, testsiz mavzu, qatnashish past, AI ishlamayapti). Ustoz 'nima qilishim kerak' desa shu.",
    schema: none,
    write: false,
    title: () => "Maslahatlarni koʻrish",
    request: () => ({ method: "GET", path: "/admin/advisor" }),
  }),
];
