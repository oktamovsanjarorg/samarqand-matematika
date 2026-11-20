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
