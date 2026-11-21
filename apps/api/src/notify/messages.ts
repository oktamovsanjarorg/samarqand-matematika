import { PARENT_FLAGS, type ParentFlag, type StudentAccess } from "@samarqand/shared";
import { isFullAccess, type AccessFacts } from "../access/access-rules";
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

const UZ_MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];
const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tashkent",
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Toshkent vaqti bilan: "30-noyabr, 23:59" */
export function uzDateTime(d: Date): string {
  const p = Object.fromEntries(PARTS.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day}-${UZ_MONTHS[Number(p.month) - 1] ?? ""}, ${p.hour}:${p.minute}`;
}

/** O'quvchiga: haftalik test ochildi (T-080) */
export const weeklyOpenText = (title: string, closesAt: Date) =>
  `📝 Yangi haftalik test: <b>${esc(title)}</b>.\n<b>${uzDateTime(closesAt)}</b> gacha ishlang va har savolga yechim rasmini yuklang.`;

/** O'quvchiga: mock ochildi (T-080) */
export const mockOpenText = (title: string, closesAt: Date) =>
  `🎓 Mock imtihon ochildi: <b>${esc(title)}</b>.\n<b>${uzDateTime(closesAt)}</b> gacha bir marta topshirasiz. Vaqt boshlagan paytingizdan hisoblanadi.`;

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

const ATTENDANCE_TEXT = {
  LATE: "darsga kechikdi",
  ABSENT: "darsga kelmadi",
  PRESENT: "darsga keldi",
  EXCUSED: "sababli kelmadi",
} as const;

/** Ota-onaga: davomat (T-055). Oldin boshqa holat yuborilgan bo'lsa "Tuzatish" */
export const attendanceParentText = (p: {
  child: string;
  group: string;
  date: string;
  status: keyof typeof ATTENDANCE_TEXT;
  correction: boolean;
}) =>
  `${p.correction ? "✏️ Tuzatish: " : "📋 "}<b>${esc(p.child)}</b> ${p.date} kuni ${ATTENDANCE_TEXT[p.status]} (${esc(p.group)}).`;

/** O'quvchiga: ustoz qabul qildi; to'liq kirish uchun nima qolgani aniq yoziladi (T-081) */
export function acceptedText(f: AccessFacts): string {
  if (isFullAccess(f)) return "✅ Ustoz sizni qabul qildi. Barcha darslar va testlar ochiq.";
  const steps = [
    ...(f.approvedParents > 0
      ? []
      : ["ota-onangizni ulang: botga /ota yuboring va havolani ularga joʻnating"]),
    ...(f.paid ? [] : ["obunani toʻlang: ilovada Profil → Obuna va toʻlovlar"]),
  ];
  return `✅ Ustoz sizni qabul qildi.\nBarcha darslar ochilishi uchun:\n${steps.map((x) => `• ${x}`).join("\n")}`;
}

/** O'quvchiga: ustoz kirish rejimini qo'lda o'zgartirdi (T-081). AUTO ga qaytishda xabar yo'q */
export const accessModeText: Partial<Record<StudentAccess, string>> = {
  FREE: "🔓 Ustoz sizga barcha darslar va testlarni ochib berdi.",
  CLOSED: "🔒 Darslar va testlarga kirishingiz yopildi. Savolingiz boʻlsa, ustozga murojaat qiling.",
};
