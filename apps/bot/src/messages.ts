import type { StaffInviteStatus } from "@samarqand/shared";
import { InlineKeyboard } from "grammy";

/** /start javobi: salomlashuv va Mini App'ni ochish tugmasi */
export function startMessage(opts: { firstName: string; brand: string; miniappUrl: string }) {
  const text = `Assalomu alaykum, ${opts.firstName}!\n\n${opts.brand} platformasiga xush kelibsiz. Darslar, testlar va natijalaringiz ilovada.`;
  const keyboard = new InlineKeyboard().webApp("📐 Ilovani ochish", opts.miniappUrl);
  return { text, keyboard };
}

/**
 * Botga oddiy matn yozilganda (T-129): bot xabarlarni o'qimaydi, ustozga yetib bormaydi.
 * Savol uchun ilovadagi AI yordamchi (o'quvchi) yoki kabinet (ota-ona).
 */
export function fallbackMessage(miniappUrl: string) {
  const text =
    "Bu bot xabarlarni oʻqimaydi va ustozga yetkazmaydi.\n\nMasala boʻyicha savolni ilovadagi AI yordamchiga yozing. Darslar, testlar, natijalar va toʻlov ham ilovada.";
  return { text, keyboard: new InlineKeyboard().webApp("📐 Ilovani ochish", miniappUrl) };
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

/** O'quvchi /ota: ota-onaga yuboriladigan havola */
export function parentInviteMessage(link: string) {
  const text = `👨‍👩‍👦 Ota-onangizni ulash uchun quyidagi havolani ularga yuboring:\n\n${link}\n\nUlar havolani ochib, raqamini ulashadi. Ustoz qoʻngʻiroq qilib tasdiqlagach, natijalaringiz haqida xabar oladi.`;
  const share = `https://t.me/share/url?url=${encodeURIComponent(link)}`;
  return { text, keyboard: new InlineKeyboard().url("📤 Ota-onaga yuborish", share) };
}

export const PARENT_ONLY_STUDENT = "Bu buyruq oʻquvchilar uchun. Avval ilovani oching.";

/** Ota-ona havolani bosdi: o'z raqamini ulashishni so'raymiz */
export const PARENT_ASK_CONTACT =
  "Assalomu alaykum! Farzandingizni ulash uchun pastdagi tugma orqali oʻz raqamingizni ulashing.";
export const SHARE_CONTACT_BUTTON = "📱 Raqamni ulashish";

export const PARENT_REPLIES: Record<string, string> = {
  created: "✅ Soʻrov yuborildi. Ustoz qoʻngʻiroq qilib tasdiqlaydi.",
  exists: "Soʻrovingiz allaqachon bor. Ustoz tasdiqlashini kuting.",
  invalid_code: "Havola notoʻgʻri. Farzandingizdan yangisini soʻrang.",
  not_own_contact: "Faqat oʻzingizning raqamingizni ulashing.",
  self: "Bu havola oʻquvchining oʻzi uchun emas: uni ota-onangizga yuboring.",
  limit: "Bu oʻquvchiga ota-onalar soni toʻlgan. Ustozga murojaat qiling.",
  rejected_before: "Oldingi soʻrov rad etilgan. Ustozga murojaat qiling.",
  is_student: "Siz oʻquvchi sifatida roʻyxatdasiz. Ustozga murojaat qiling.",
};

/** T-155: /start s_<kod> (ustozning yordamchi taklif havolasi) */
export const STAFF_INVITE_REPLIES: Record<StaffInviteStatus, string> = {
  ok: "✅ Siz ustoz yordamchisi boʻldingiz. Admin panelga kirish uchun /admin deb yozing.",
  invalid: "Havola eskirgan yoki ishlatilgan. Ustozdan yangi havola soʻrang.",
  already: "Siz allaqachon yordamchisiz. Admin panel: /admin",
  teacher: "Siz ustozsiz, havola kerak emas. Admin panel: /admin",
  parent: "Ota-ona akkaunti yordamchi boʻla olmaydi. Havolani boshqa Telegram akkauntdan oching.",
  blocked: "Akkauntingiz bloklangan. Ustozga murojaat qiling.",
};
export const STAFF_INVITE_FAILED = "Hozir ulab boʻlmadi, birozdan keyin havolani qayta oching.";
