import {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  ClipboardCheck,
  GraduationCap,
  type LucideIcon,
  RotateCcw,
  Trophy,
} from "lucide-react";

/** Placeholder'larni prerender Caddy shabloniga almashtiradi: ilova (DOMAIN) va sayt (so'rov hosti) manzili */
export const APP_URL = "__APP__";
export const SITE_URL = "__SITE__";

export const SITE_TITLE = "Samarqand matematika: imtihon va milliy sertifikatga tayyorgarlik";
export const SITE_DESCRIPTION =
  "Matematikadan darslar, mavzu testlari, haftalik reyting, mock imtihon va AI yordamchi: hammasi Telegram ichida. Ota-onalar natija va davomatni kuzatib boradi.";

export interface Item {
  Icon: LucideIcon;
  title: string;
  text: string;
}

export const FEATURES: Item[] = [
  {
    Icon: BookOpen,
    title: "Darslar",
    text: "Mavzular boʻyicha konspekt va video. Formulalar telefonda ham aniq koʻrinadi",
  },
  {
    Icon: ClipboardCheck,
    title: "Mavzu testlari",
    text: "Har mavzudan keyin oʻzingizni tekshiring: natija, toʻgʻri javob va yechim darhol",
  },
  {
    Icon: RotateCcw,
    title: "Xatolar ustida ishlash",
    text: "Notoʻgʻri javob bergan savollaringiz alohida yigʻiladi va qayta yechiladi",
  },
  {
    Icon: Trophy,
    title: "Haftalik test va reyting",
    text: "Har hafta bitta test: ball va guruhdagi oʻrningiz",
  },
  {
    Icon: GraduationCap,
    title: "Mock imtihon",
    text: "Milliy sertifikat formatidagi sinov imtihonlari, vaqt cheklovi bilan",
  },
  {
    Icon: Bot,
    title: "AI yordamchi",
    text: "Tushunmagan masalani yozing yoki rasmini yuboring: avval ishora, keyin yechim",
  },
  {
    Icon: BarChart3,
    title: "Shaxsiy tavsiyalar",
    text: "Qaysi mavzuni takrorlash kerakligini natijalaringiz koʻrsatadi",
  },
  {
    Icon: Award,
    title: "Yutuqlar va nishonlar",
    text: "Ketma-ket kunlar, oʻzlashtirilgan mavzular va haftalik faollik bir qarashda",
  },
];

export const STEPS = [
  { title: "Botni oching", text: "Pastdagi tugma bilan Telegram botini oching va «Start» ni bosing" },
  {
    title: "Roʻyxatdan oʻting",
    text: "Ism-familiya va telefon raqamingizni kiriting. Bepul darslar darhol ochiladi",
  },
  {
    title: "Oʻqishni boshlang",
    text: "Ustoz sizni qabul qiladi, ota-onangiz ulanib toʻlov qilingach barcha darslar ochiladi",
  },
];

export const PARENTS = [
  "Test va haftalik imtihon natijalari Telegram xabarida",
  "Darsga kelgan-kelmagani haqida xabar",
  "Toʻlov muddati yaqinlashganda eslatma",
  "Ulanish oddiy: farzandingiz profilidan havola yuboradi",
];

export const FAQ = [
  {
    q: "Ilova oʻrnatish kerakmi?",
    a: "Yoʻq. Platforma Telegram ichida ochiladi: botni oching va «Ilovani ochish» tugmasini bosing. Telefon, planshet va kompyuterda ishlaydi.",
  },
  {
    q: "Bepul darslar bormi?",
    a: "Ha. Ustoz bepul deb belgilagan darslar roʻyxatdan oʻtishingiz bilan ochiladi. Qolgan darslar va testlar toʻliq kirish bilan ochiladi.",
  },
  {
    q: "Toʻlov qanday qilinadi?",
    a: "Ilovada tarifni tanlaysiz, koʻrsatilgan kartaga oʻtkazasiz va chek rasmini yuborasiz. Ustoz tasdiqlagach obuna ochiladi, tugashiga 3 kun qolganda eslatma keladi.",
  },
  {
    q: "AI yordamchi javobni tayyor aytib beradimi?",
    a: "Avval ishora beradi, toʻliq yechimni oʻzingiz urinib koʻrgandan keyin koʻrsatadi. Haftalik test yoki mock ochiq paytida shu test savollari boʻyicha yordam bermaydi. Baholarni faqat ustoz qoʻyadi.",
  },
  {
    q: "Ota-ona nimalarni koʻradi?",
    a: "Farzandining test natijalari, darsga kelgan-kelmagani va toʻlov muddati haqida Telegram orqali xabar oladi.",
  },
];
