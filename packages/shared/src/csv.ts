/**
 * Excel uchun CSV (T-076): UTF-8 BOM (o'zbek harflari to'g'ri chiqadi), ";" ajratuvchi va o'nlik vergul
 * (Excel'ning uz/ru sozlamasi shunday kutadi), qatorlar CRLF bilan.
 * Matn "=", "+", "-", "@" bilan boshlansa oldiga ' qo'yiladi: Excel uni formula deb bajarmaydi.
 */
export type CsvCell = string | number | null;

const FORMULA = /^[=+\-@\t\r]/;

function cell(v: CsvCell): string {
  if (v === null) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
  const safe = FORMULA.test(v) ? `'${v}` : v;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: CsvCell[][]): string {
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
