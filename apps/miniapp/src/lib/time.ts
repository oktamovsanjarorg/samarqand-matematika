/** Sof vaqt funksiyalari (brauzer API'siga bog'liq emas, unit test qilinadi) */

const MIN = 60_000;

/** Yopilishigacha qolgan vaqt: "2 kun 5 soat", "3 soat 20 daqiqa", "15 daqiqa" */
export function timeLeft(closesAt: string, now: Date): string {
  const m = Math.max(0, Math.floor((new Date(closesAt).getTime() - now.getTime()) / MIN));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return h ? `${d} kun ${h} soat` : `${d} kun`;
  if (h > 0) return m % 60 ? `${h} soat ${m % 60} daqiqa` : `${h} soat`;
  return `${m} daqiqa`;
}

const STAMP = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Tashkent",
});

/** "29.11, 23:59" (Toshkent vaqti) */
export function formatStamp(iso: string): string {
  const p = Object.fromEntries(STAMP.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}.${p.month}, ${p.hour}:${p.minute}`;
}

/** Teskari sanoq: "1:05:09", "24:59", "0:07" (soniya aniqligida) */
export function clock(msLeft: number): string {
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

const WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
const MONTHS = [
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
const DAY_PARTS = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Tashkent",
});

/** "Shanba, 21-noyabr" (Toshkent sanasi, o'zbekcha) */
export function uzToday(now: Date): string {
  const p = Object.fromEntries(DAY_PARTS.formatToParts(now).map((x) => [x.type, x.value]));
  const d = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  const w = WEEKDAYS[d.getUTCDay()] ?? "";
  return `${w.charAt(0).toUpperCase()}${w.slice(1)}, ${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}`;
}
