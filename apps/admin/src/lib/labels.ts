import type { StudentAccess } from "@samarqand/shared";

export const ACCESS_LABELS: Record<StudentAccess, string> = {
  AUTO: "Avtomatik",
  FREE: "Bepul ochiq",
  CLOSED: "Yopiq",
};

export const ACCESS_HINTS: Record<StudentAccess, string> = {
  AUTO: "Qabul + ota-ona tasdigʻi + toʻlov boʻlsa ochiladi",
  FREE: "Shartlarsiz ochiq",
  CLOSED: "Hamma pullik narsa yopiq",
};

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tashkent",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Toshkent vaqti bilan "20.11.2026, 15:09" */
export function formatDate(iso: string): string {
  const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}.${p.month}.${p.year}, ${p.hour}:${p.minute}`;
}

/** Obuna holati (T-094, T-110): "Obuna 21.12.2026 gacha" yoki "Obuna toʻlanmagan" */
export const paidLabel = (paidUntil: string | null) =>
  paidUntil ? `Obuna ${formatDate(paidUntil).slice(0, 10)} gacha` : "Obuna toʻlanmagan";
