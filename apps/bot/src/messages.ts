import { InlineKeyboard } from "grammy";

/** /start javobi: salomlashuv va Mini App'ni ochish tugmasi */
export function startMessage(opts: { firstName: string; brand: string; miniappUrl: string }) {
  const text = `Assalomu alaykum, ${opts.firstName}!\n\n${opts.brand} platformasiga xush kelibsiz. Darslar, testlar va natijalaringiz ilovada.`;
  const keyboard = new InlineKeyboard().webApp("📐 Ilovani ochish", opts.miniappUrl);
  return { text, keyboard };
}

export const ADMIN_NOT_STAFF = "Boshqaruv paneli faqat ustoz va yordamchilar uchun.";
export const ADMIN_FAILED = "Hozir havola yaratib boʻlmadi, birozdan keyin urinib koʻring.";

/** /admin javobi: bir martalik havola tugmasi */
export function adminLinkMessage(url: string) {
  const text =
    "🔐 Boshqaruv paneliga kirish havolasi.\n\nHavola 5 daqiqa amal qiladi va faqat bir marta ishlaydi. Uni hech kimga yubormang.";
  return { text, keyboard: new InlineKeyboard().url("Panelni ochish", url) };
}

/** Raqam ulashilgandan keyingi javob (BR-S02: faqat o'z raqami) */
export const PHONE_REPLIES = {
  saved: "✅ Raqamingiz saqlandi. Ilovaga qaytishingiz mumkin.",
  foreign: "Faqat oʻzingizning raqamingizni ulashing: pastdagi tugmani bosing.",
  unknown: "Avval ilovani bir marta oching, keyin raqamni ulashing.",
  failed: "Hozir raqamni saqlab boʻlmadi, birozdan keyin urinib koʻring.",
} as const;
