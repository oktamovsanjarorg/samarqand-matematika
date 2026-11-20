const DAY_MS = 24 * 60 * 60_000;
const TASHKENT_MS = 5 * 60 * 60_000;

/** Toshkent (UTC+5, yozgi vaqt yo'q) bo'yicha kun boshi: kunlik limitlar uchun */
export const tashkentDayStart = (now: Date) =>
  new Date(Math.floor((now.getTime() + TASHKENT_MS) / DAY_MS) * DAY_MS - TASHKENT_MS);
