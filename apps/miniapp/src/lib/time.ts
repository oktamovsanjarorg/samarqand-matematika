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
