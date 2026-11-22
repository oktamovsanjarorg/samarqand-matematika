import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

/**
 * T-154: Excel (.xlsx) faylini brauzerda o'qish va yozish. .xlsx — XML fayllar zip arxivi;
 * faqat birinchi varaq va oddiy qiymatlar (matn, son, mantiqiy) kerak, shuning uchun og'ir kutubxona olinmaydi.
 */
export type XlsxCell = string | number | null;

const ENTITIES: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] !== "#") return ENTITIES[e] ?? m;
    const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return String.fromCodePoint(code);
  });

/** <si> yoki <is> ichidagi barcha <t> bo'laklari (formatlangan matn bir nechta bo'lakda keladi) */
const texts = (xml: string) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)]
    .map((m) => decode(m[1] ?? ""))
    .join("");

const attr = (attrs: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];

/** A1 → 0, AB7 → 27 */
function columnOf(ref: string): number {
  let n = 0;
  for (const ch of /^[A-Z]+/.exec(ref)?.[0] ?? "A") n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function firstSheetPath(files: Record<string, Uint8Array>): string {
  const book = files["xl/workbook.xml"];
  const rels = files["xl/_rels/workbook.xml.rels"];
  const id = book && /<sheet\b[^>]*\br:id="([^"]+)"/.exec(strFromU8(book))?.[1];
  const target = id && rels && new RegExp(`<Relationship\\b[^>]*Id="${id}"[^>]*>`).exec(strFromU8(rels))?.[0];
  const path = target && attr(target, "Target");
  if (!path) return "xl/worksheets/sheet1.xml";
  return path.startsWith("/") ? path.slice(1) : `xl/${path}`;
}

function cellValue(attrs: string, inner: string, shared: string[]): XlsxCell {
  const type = attr(attrs, "t");
  if (type === "inlineStr") return texts(inner);
  const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
  if (v === undefined) return null;
  if (type === "s") return shared[Number(v)] ?? null;
  if (type === "str") return decode(v);
  if (type === "b") return v === "1" ? "TRUE" : "FALSE";
  if (type === "e") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : decode(v);
}

export class XlsxError extends Error {}

function unzip(data: Uint8Array): Record<string, Uint8Array> {
  try {
    return unzipSync(data);
  } catch {
    throw new XlsxError("Fayl Excel (.xlsx) emas yoki buzilgan");
  }
}

/** Qator ichidagi kataklar: ustun harfi bo'yicha joyiga (o'tkazib yuborilgan kataklar null) */
function rowCells(xml: string, shared: string[]): XlsxCell[] {
  const cells: XlsxCell[] = [];
  for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = attr(c[1] ?? "", "r");
    const col = ref ? columnOf(ref) : cells.length;
    while (cells.length < col) cells.push(null);
    cells[col] = cellValue(c[1] ?? "", c[2] ?? "", shared);
  }
  return cells;
}

const isBlank = (r: XlsxCell[] | undefined) => !r || r.every((c) => c === null || c === "");

/** Birinchi varaq qatorlari; bo'sh kataklar null, oxiridagi bo'sh qatorlar tashlanadi */
export function readXlsx(data: Uint8Array): XlsxCell[][] {
  const files = unzip(data);
  const sheet = files[firstSheetPath(files)];
  if (!sheet) throw new XlsxError("Excel faylida varaq topilmadi");
  const sst = files["xl/sharedStrings.xml"];
  const shared = sst
    ? [...strFromU8(sst).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1] ?? ""))
    : [];
  const rows: XlsxCell[][] = [];
  for (const row of strFromU8(sheet).matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const index = Number(attr(row[1] ?? "", "r") ?? rows.length + 1) - 1;
    while (rows.length < index) rows.push([]);
    rows[index] = rowCells(row[2] ?? "", shared);
  }
  while (rows.length && isBlank(rows[rows.length - 1])) rows.pop();
  return rows;
}

/** XML 1.0 da taqiqlangan boshqaruv belgilari (tab va qator oxiridan tashqari) tashlanadi */
const xmlSafe = (s: string) =>
  [...s].filter((ch) => ch.charCodeAt(0) >= 32 || ch === "\t" || ch === "\n" || ch === "\r").join("");

const escape = (s: string) =>
  xmlSafe(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const letters = (i: number): string =>
  (i < 26 ? "" : letters(Math.floor(i / 26) - 1)) + String.fromCharCode(65 + (i % 26));

/** Uslublar: 0 — oddiy, 1 — matn ("@": 3/4 sana bo'lib qolmaydi), 2 — qalin sarlavha (matn) */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const REL_NS = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const PKG = "http://schemas.openxmlformats.org/package/2006/relationships";
const DOC = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const CT = "application/vnd.openxmlformats-officedocument.spreadsheetml";

function sheetXml(rows: XlsxCell[][]): string {
  const width = Math.max(1, ...rows.map((r) => r.length));
  const cols = Array.from({ length: width }, (_, i) => {
    const len = Math.max(8, ...rows.map((r) => String(r[i] ?? "").length + 2));
    return `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, len)}" style="1" customWidth="1"/>`;
  }).join("");
  const data = rows
    .map((r, y) => {
      const cells = r
        .map((v, x) => {
          if (v === null || v === "") return "";
          const ref = `${letters(x)}${y + 1}`;
          if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
          return `<c r="${ref}" t="inlineStr" s="${y === 0 ? 2 : 1}"><is><t xml:space="preserve">${escape(v)}</t></is></c>`;
        })
        .join("");
      return `<row r="${y + 1}">${cells}</row>`;
    })
    .join("");
  const pane = '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet ${NS}><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><cols>${cols}</cols><sheetData>${data}</sheetData></worksheet>`;
}

/**
 * Bitta varaqli .xlsx: birinchi qator qalin sarlavha va qotirilgan; ustunlar matn formatida,
 * shuning uchun ustoz yozgan "3/4" yoki telefon raqami Excel'da sana yoki 9,98E+11 bo'lib qolmaydi.
 */
export function writeXlsx(rows: XlsxCell[][], sheetName = "Varaq1"): Uint8Array {
  const name = escape(
    sheetName
      .replace(/[[\]:*?/\\]/g, " ")
      .slice(0, 31)
      .trim() || "Varaq1",
  );
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return zipSync({
    "[Content_Types].xml": strToU8(
      `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${CT}.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${CT}.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${CT}.styles+xml"/></Types>`,
    ),
    "_rels/.rels": strToU8(
      `${xml}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${DOC}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `${xml}<workbook ${NS} ${REL_NS}><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `${xml}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${DOC}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${DOC}/styles" Target="styles.xml"/></Relationships>`,
    ),
    "xl/styles.xml": strToU8(STYLES),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml(rows)),
  });
}
