import type { WeeklyStatus } from "@samarqand/shared";

export const STATUS_LABELS: Record<WeeklyStatus, string> = {
  UPCOMING: "Ochilmagan",
  OPEN: "Ochiq",
  CLOSED: "Yopilgan",
};

const OFFSET_MS = 5 * 60 * 60 * 1000;

/** ISO → <input type="datetime-local"> qiymati, Toshkent vaqtida (brauzer qaysi zonada bo'lishidan qat'i nazar) */
export const toLocalInput = (iso: string) =>
  new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(0, 16);

/** datetime-local (Toshkent) → ISO */
export const fromLocalInput = (v: string) => new Date(`${v}:00+05:00`).toISOString();

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Nusxa oynasi (T-089): manba oynasi 7 kunlab suriladi, ochilishi hozirdan keyin bo'lguncha */
export function shiftedWindow(opensAt: string, closesAt: string, now: Date) {
  const [o, c] = [Date.parse(opensAt), Date.parse(closesAt)];
  const weeks = Math.max(1, Math.floor((now.getTime() - o) / WEEK_MS) + 1);
  return {
    opensAt: new Date(o + weeks * WEEK_MS).toISOString(),
    closesAt: new Date(c + weeks * WEEK_MS).toISOString(),
  };
}

/** "48-hafta" → "49-hafta". Raqam bilan boshlanmasa bo'sh: ustoz o'zi yozadi */
export function nextTitle(title: string): string {
  const m = /^(\d+)(.*)$/.exec(title.trim());
  return m ? `${Number(m[1]) + 1}${m[2] ?? ""}` : "";
}
