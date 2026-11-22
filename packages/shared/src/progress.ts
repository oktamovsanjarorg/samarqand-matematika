/**
 * O'quvchining o'z yutuqlari (T-169): asosiy sahifadagi faollik, o'zlashtirish va nishonlar.
 * Hammasi haqiqiy urinishlardan hisoblanadi, kun Toshkent vaqti bo'yicha (BR-R05).
 */

/** Mavzu "o'zlashtirilgan": eng yaxshi mavzu testi natijasi shu foizdan past emas */
export const MASTERY_PERCENT = 80;
/** Seriya va faollik shu kunlar ichidagi javoblardan hisoblanadi */
export const PROGRESS_LOOKBACK_DAYS = 120;

export const BADGES = {
  "first-test": { title: "Birinchi qadam", hint: "Birinchi mavzu testini topshiring" },
  "tests-10": { title: "Oʻnta test", hint: "10 ta mavzu testini topshiring" },
  "answers-100": { title: "Yuzta javob", hint: "100 ta savolga javob bering" },
  "streak-7": { title: "Bir hafta tinmay", hint: "7 kun ketma-ket shugʻullaning" },
  "mastered-1": {
    title: "Mavzu ustasi",
    hint: `Bitta mavzuda ${MASTERY_PERCENT}% va undan yuqori natija oling`,
  },
  "weekly-top3": { title: "Uchlikda", hint: "Haftalik testda 1–3-oʻrinni egallang" },
} as const;

export type BadgeKey = keyof typeof BADGES;

export interface MyProgress {
  streak: {
    /** Bugun yoki kechagacha uzilmagan ketma-ket kunlar (bugun hali shug'ullanmagan bo'lsa ham saqlanadi) */
    current: number;
    best: number;
    activeToday: boolean;
  };
  /** Oxirgi 7 kun, eskisidan bugungacha: javob berilgan savollar soni */
  week: { date: string; answers: number }[];
  topics: {
    /** Eng yaxshi natija MASTERY_PERCENT dan past emas */
    mastered: number;
    /** Kamida bir marta test topshirilgan */
    started: number;
    /** Nashr qilingan kursdagi, nashr qilingan savoli bor mavzular */
    available: number;
  };
  /** Mavzu testlarida avtomatik tekshirilgan javoblar (xatolar ustida ishlash ham kiradi) */
  answers: { checked: number; correct: number };
  /** Oxirgi yopilgan, o'quvchi topshirgan haftalik test */
  weekly: { title: string; place: number; participants: number } | null;
  /** Oxirgi 30 kun davomati; belgilanmagan bo'lsa null. Kechikkan ham "keldi" */
  attendance: { present: number; total: number } | null;
  badges: { key: BadgeKey; done: boolean }[];
}
