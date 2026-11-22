import { toCsv } from "@samarqand/shared";
import { XlsxError, type XlsxCell } from "./xlsx";

/**
 * T-165: jadval faylini turini kengaytmaga emas, ichidagi baytlarga qarab aniqlash. Amalda ".xls" nomli fayl
 * ko'pincha .xlsx (nomi o'zgartirilgan) yoki saytdan yuklangan HTML jadval bo'ladi.
 */
export type TableKind = "xlsx" | "xls" | "html" | "text";

export function kindOf(b: Uint8Array): TableKind {
  if (b[0] === 0x50 && b[1] === 0x4b) return "xlsx"; // "PK": zip
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "xls"; // OLE2
  const head = new TextDecoder().decode(b.subarray(0, 512)).trimStart().toLowerCase();
  if (/^<(!doctype|html|table|\?xml[\s\S]*<html)/.test(head)) return "html";
  return "text";
}

const ENT: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] !== "#") return ENT[e.toLowerCase()] ?? m;
    return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  });

/** HTML jadval: birinchi <table> qatorlari; teglar olib tashlanadi, <br> bo'sh joy bo'ladi */
export function readHtmlTable(html: string): XlsxCell[][] {
  const table = /<table\b[\s\S]*?<\/table>/i.exec(html)?.[0] ?? html;
  const rows: XlsxCell[][] = [];
  for (const tr of table.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/table>|$)/gi)) {
    const cells = [...(tr[1] ?? "").matchAll(/<t[dh]\b[^>]*>([\s\S]*?)(?=<t[dh]\b|<\/tr>|$)/gi)].map((m) => {
      const text = decode(
        (m[1] ?? "")
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " "),
      ).trim();
      return text === "" ? null : text;
    });
    rows.push(cells);
  }
  while (rows.length && rows[rows.length - 1]?.every((c) => c === null)) rows.pop();
  return rows;
}

/** Jadval fayli → CSV matni: tekshiruv va import bitta yo'ldan o'tadi (T-154, T-165) */
export async function tableText(bytes: Uint8Array, name = ""): Promise<string> {
  const kind = kindOf(bytes);
  // Nomi Excel, ichi jadval emas: CSV deb jimgina o'qib yubormaslik
  if (kind === "text" && /\.xlsx?$/i.test(name)) throw new XlsxError("Fayl Excel (.xlsx) emas yoki buzilgan");
  if (kind === "xlsx") return toCsv((await import("./xlsx")).readXlsx(bytes));
  if (kind === "xls") return toCsv((await import("./xls")).readXls(bytes));
  const text = new TextDecoder().decode(bytes);
  return kind === "html" ? toCsv(readHtmlTable(text)) : text;
}
