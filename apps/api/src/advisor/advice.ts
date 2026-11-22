import { ADVICE, type Advice } from "@samarqand/shared";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const plural = (n: number, word: string) => `${n} ta ${word}`;

export interface AnswerRow {
  topicId: string;
  userId: string;
  correct: boolean;
}

/** Sinf bo'yicha qiyin mavzu: kamida 3 o'quvchi va 15 javob, to'g'ri ulush 50% dan past. Eng qiyin 2 tasi */
export function weakTopicAdvice(rows: AnswerRow[], titles: Map<string, string>): Advice[] {
  const by = new Map<string, { ok: number; all: number; users: Set<string> }>();
  for (const r of rows) {
    const t = by.get(r.topicId) ?? { ok: 0, all: 0, users: new Set<string>() };
    t.all++;
    if (r.correct) t.ok++;
    t.users.add(r.userId);
    by.set(r.topicId, t);
  }
  return [...by.entries()]
    .filter(([, t]) => t.users.size >= ADVICE.weakMinStudents && t.all >= ADVICE.weakMinAnswers)
    .map(([id, t]) => ({ id, t, p: pct(t.ok, t.all) }))
    .filter((x) => x.p < ADVICE.weakPercent)
    .sort((a, b) => a.p - b.p)
    .slice(0, 2)
    .map(({ id, t, p }) => ({
      key: `weak:${id}`,
      level: "important" as const,
      title: `«${titles.get(id) ?? "Mavzu"}» mavzusida sinf qiynalyapti`,
      why: `Oxirgi ${ADVICE.days} kunda ${t.users.size} oʻquvchining ${t.all} ta javobidan faqat ${p}% toʻgʻri. Darsda qayta tushuntirib, mavzu testini yana ishlatish foydali.`,
      action: { label: "Mavzu savollari", to: `/content/topics/${id}/questions` },
    }));
}

/** Haftalik test ochiq ham emas, yaqin 7 kunda ochiladigani ham yo'q */
export function weeklyPlanAdvice(p: { planned: boolean; students: number }): Advice[] {
  if (p.planned || p.students === 0) return [];
  return [
    {
      key: "weekly:none-ahead",
      level: "urgent",
      title: "Keyingi haftalik test rejalashtirilmagan",
      why: `Hozir ochiq test yoʻq va ${ADVICE.weeklyAheadDays} kun ichida ochiladigani ham yoʻq. ${plural(p.students, "oʻquvchi")} bu hafta oʻzini sinay olmaydi.`,
      action: { label: "Yangi haftalik test", to: "/weekly/new" },
    },
  ];
}

export interface TopicContent {
  id: string;
  title: string;
  lessons: number;
  questions: number;
}

/** Darsi nashr qilingan, lekin nashr qilingan savoli yo'q mavzular: mavzu testi ochilmaydi */
export function noTestTopicsAdvice(topics: TopicContent[]): Advice[] {
  const bare = topics.filter((t) => t.lessons > 0 && t.questions === 0);
  if (bare.length === 0) return [];
  const names = bare
    .slice(0, 3)
    .map((t) => `«${t.title}»`)
    .join(", ");
  return [
    {
      key: "content:no-test",
      level: "important",
      title: `${plural(bare.length, "mavzuda")} dars bor, lekin test yoʻq`,
      why: `${names}${bare.length > 3 ? " va boshqalar" : ""}: oʻquvchi darsni oʻqiydi, lekin oʻzini tekshira olmaydi. Savol qoʻshing yoki Excel'dan import qiling.`,
      action: { label: "Savol qoʻshish", to: `/content/topics/${bare[0]?.id ?? ""}/questions` },
    },
  ];
}

/** 3 kundan beri nashr qilinmagan qoralama savollar */
export function draftAdvice(drafts: number): Advice[] {
  if (drafts === 0) return [];
  return [
    {
      key: "content:drafts",
      level: "info",
      title: `${plural(drafts, "savol")} qoralamada qolib ketgan`,
      why: `${ADVICE.draftDays} kundan koʻproq vaqtdan beri nashr qilinmagan: oʻquvchilar ularni koʻrmaydi. Haftalik test uchun saqlab qoʻyilgan boʻlsa, eʼtibor bermang.`,
      action: { label: "Kontent", to: "/content" },
    },
  ];
}

export interface LastWeekly {
  title: string;
  submitted: number;
  eligible: number;
}

/** Oxirgi yopilgan haftalikni toʻliq kirishli o'quvchilarning yarmidan kami topshirgan */
export function participationAdvice(w: LastWeekly | null, teacher: boolean): Advice[] {
  if (!w || w.eligible < 4 || pct(w.submitted, w.eligible) >= ADVICE.participationPercent) return [];
  return [
    {
      key: "weekly:participation",
      level: "important",
      title: `«${w.title}» ni faqat ${w.submitted}/${w.eligible} oʻquvchi topshirgan`,
      why: `Qatnashish ${pct(w.submitted, w.eligible)}%. Keyingi test ochilganda bir kun oldin eʼlon bilan eslatish va ota-onalarga xabar berish qatnashishni oshiradi.`,
      // E'lon faqat ustozda (BR-B05 kabi): yordamchiga haftalik ro'yxati
      action: teacher
        ? { label: "Eʼlon yuborish", to: "/broadcast" }
        : { label: "Haftalik testlar", to: "/weekly" },
    },
  ];
}
