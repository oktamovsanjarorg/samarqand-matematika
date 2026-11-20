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

/** Ustozga: yangi to'lov cheki */
export const paymentSubmittedText = (p: { student: string; plan: string; amount: string }) =>
  `💳 Yangi toʻlov cheki: <b>${esc(p.student)}</b>\n${esc(p.plan)} · ${p.amount} soʻm`;

export const paymentApprovedText = (until: string) =>
  `✅ Toʻlovingiz tasdiqlandi. Barcha darslar <b>${until}</b> gacha ochiq.`;

export const paymentRejectedText = (reason: string) =>
  `Toʻlov cheki qabul qilinmadi.\nSabab: ${esc(reason)}\n\nIlovada qayta yuborishingiz mumkin.`;

/** O'quvchiga: haftalik test yopilishiga oz qoldi (BR-W07) */
export const weeklyReminderText = (title: string, hours: number) =>
  `⏰ Haftalik test <b>${esc(title)}</b> yopilishiga ${hours} soat qoldi.\nTopshirilmagan test 0 ball boʻladi.`;

/** O'quvchiga: oyna yopildi, natija (BR-W08) */
export const weeklyResultText = (title: string, score: number, total: number) =>
  `📊 Haftalik test <b>${esc(title)}</b> natijasi: <b>${score}/${total}</b>.\nToʻgʻri javoblarni ilovada koʻring.`;

/** Ota-onaga: haftalik test hisoboti (T-035b). AI shubhasi hech qachon yozilmaydi (BR-W05) */
export const weeklyParentReport = (
  child: string,
  title: string,
  r: { score: number; total: number; place: number; participants: number } | null,
) =>
  r
    ? `📘 <b>${esc(child)}</b>, haftalik test <b>${esc(title)}</b>:\nBall: <b>${r.score}/${r.total}</b> · oʻrin: ${r.place}/${r.participants}`
    : `📘 <b>${esc(child)}</b> haftalik test <b>${esc(title)}</b>ni topshirmadi: 0 ball.`;

/** O'quvchiga: mock natijasi (T-053) */
export const mockResultText = (
  title: string,
  r: { scaled: number; scaleMax: number; grade: string | null },
) =>
  `📊 Mock <b>${esc(title)}</b> natijasi: <b>${r.scaled}/${r.scaleMax}</b>${r.grade ? `, daraja <b>${esc(r.grade)}</b>` : ""}.\nBoʻlimlar va toʻgʻri javoblar ilovada.`;
