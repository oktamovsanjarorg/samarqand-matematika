import { PARENT_FLAGS, type ParentFlag } from "@samarqand/shared";
import { esc } from "./notify.service";

/** Ustozga: yangi ota-ona so'rovi */
export function parentRequestText(p: {
  parent: string;
  student: string;
  phone: string;
  flags: ParentFlag[];
}) {
  return [
    `👨‍👩‍👦 Ota-ona soʻrovi: <b>${esc(p.parent)}</b> → <b>${esc(p.student)}</b>`,
    `Telefon: ${esc(p.phone)}`,
    ...p.flags.map((f) => `⚠️ ${PARENT_FLAGS[f]}`),
    "",
    "Raqamga qoʻngʻiroq qilib tekshiring.",
  ].join("\n");
}

/** O'quvchiga: kimdir ota-onangiz sifatida so'rov yubordi (begona odam bo'lsa, o'quvchi bilib qoladi) */
export const parentRequestToStudent = (parent: string) =>
  `👨‍👩‍👦 <b>${esc(parent)}</b> sizning ota-onangiz sifatida ulanish soʻrovini yubordi. Ustoz tasdiqlagach, natijalaringiz haqida xabar oladi.`;

export const parentApprovedToParent = (student: string) =>
  `✅ Siz <b>${esc(student)}</b>ning ota-onasi sifatida tasdiqlandingiz. Natijalar haqida shu yerda xabar olasiz.`;

export const parentApprovedToStudent = (parent: string) =>
  `✅ Ota-onangiz <b>${esc(parent)}</b> tasdiqlandi.`;

export const parentRejectedToParent = (reason: string) => `Soʻrovingiz rad etildi.\nSabab: ${esc(reason)}`;

/** Ustozga: o'quvchi ism va telefonni kiritdi, qabul qilishni kutmoqda */
export const newStudentText = (name: string, phone: string) =>
  `🆕 Yangi oʻquvchi: <b>${esc(name)}</b>\nTelefon: ${esc(phone)}\n\nQabul qilish yoki kirish rejimini belgilash uchun panelni oching.`;
