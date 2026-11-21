import { toCsv, type CsvCell } from "@samarqand/shared";

/** Toshkent vaqti, Excel tushunadigan ko'rinishda: 2026-11-21 20:13 */
export const csvTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Tashkent" }).slice(0, 16) : null;

/** Fayl nomi: test nomidan, xavfli belgilarsiz */
const fileName = (title: string) => `${title.replace(/[^\p{L}\p{N} _-]+/gu, "").trim() || "natijalar"}.csv`;

/** CSV'ni brauzerda yasab yuklab beradi (T-076): server ishtirok etmaydi */
export function downloadCsv(title: string, rows: CsvCell[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName(title);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Telefon matn bo'lib qolsin (Excel uzun sonni 9,98E+11 qilib yubormasin): 998 90 123 45 67 */
export const csvPhone = (p: string | null) =>
  p ? p.replace(/^\+?(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5") : null;
