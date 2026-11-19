import katex from "katex";
import { splitMath, type Segment } from "./segments";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

/**
 * Xavfsiz KaTeX sozlamalari: `trust: false` (\href, \url, \htmlClass o'chiq),
 * makro portlashi va o'lcham cheklangan, xato bo'lsa formula qizil matn bo'lib chiqadi (sahifa buzilmaydi).
 */
const OPTIONS = {
  throwOnError: false,
  trust: false,
  strict: "ignore",
  maxSize: 20,
  maxExpand: 500,
  output: "htmlAndMathml",
} as const;

export function renderFormula(latex: string, displayMode = false): string {
  return katex.renderToString(latex, { ...OPTIONS, displayMode });
}

function renderSegment(seg: Segment): string {
  if (seg.kind === "text") return escapeHtml(seg.value);
  return renderFormula(seg.value, seg.kind === "display");
}

/**
 * Savol, variant, izoh matnini HTML'ga aylantiradi: formulalar KaTeX bilan, qolgani escape qilinadi.
 * Natijani `dangerouslySetInnerHTML` ga berish xavfsiz: foydalanuvchi matnidan HTML o'tmaydi.
 * Qator ko'chishi saqlanishi uchun konteynerda `white-space: pre-wrap` ishlatiladi.
 */
export function renderMathText(text: string): string {
  return splitMath(text).map(renderSegment).join("");
}

/** Matnda formula bormi (KaTeX CSS'ni yuklash kerakmi) */
export function hasMath(text: string): boolean {
  return splitMath(text).some((s) => s.kind !== "text");
}
