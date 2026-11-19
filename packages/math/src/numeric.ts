import { absR, add, compare, div, rational, sub, type Rational } from "./rational";

const INT = /^[+-]?\d+$/;
const DEC = /^([+-]?)(\d*)[.,](\d+)$/;
const FRAC_LATEX = /^([+-]?)\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}$/;
const SLASH = /^([^/]+)\/([^/]+)$/;
const MIXED = /^([+-]?)(\d+)\s+(\d+)\/(\d+)$/;

/** Unicode minus, bo'shliqlar, LaTeX bo'shliq buyruqlari va o'rab turgan $ lar olib tashlanadi */
function normalize(input: string): string {
  return input
    .trim()
    .replace(/^\$+|\$+$/g, "")
    .replace(/[−–]/g, "-")
    .replace(/\\[,;:! ]/g, "")
    .replace(/\\left|\\right/g, "")
    .trim();
}

function parseSimple(s: string): Rational | null {
  const t = s
    .trim()
    .replace(/^\((.*)\)$/, "$1")
    .trim();
  if (INT.test(t)) return rational(BigInt(t), 1n);
  const dec = DEC.exec(t);
  if (dec) {
    const [, sign = "", whole = "", frac = ""] = dec;
    const scale = 10n ** BigInt(frac.length);
    const n = BigInt(whole || "0") * scale + BigInt(frac);
    return rational(sign === "-" ? -n : n, scale);
  }
  return null;
}

const negate = (r: Rational | null, sign: string) => (r && sign === "-" ? { num: -r.num, den: r.den } : r);

function parseLatexFraction(s: string): Rational | null {
  const m = FRAC_LATEX.exec(s);
  return m ? negate(quotient(m[2] ?? "", m[3] ?? ""), m[1] ?? "") : null;
}

/** Aralash son: `1 1/2` = 3/2 */
function parseMixed(s: string): Rational | null {
  const m = MIXED.exec(s);
  if (!m) return null;
  const frac = rational(BigInt(m[3] ?? "0"), BigInt(m[4] ?? "1"));
  if (!frac) return null;
  return negate(add(rational(BigInt(m[2] ?? "0"), 1n) as Rational, frac), m[1] ?? "");
}

function parseSlash(s: string): Rational | null {
  const m = SLASH.exec(s);
  return m ? quotient(m[1] ?? "", m[2] ?? "") : null;
}

function parseFraction(s: string): Rational | null {
  return parseLatexFraction(s) ?? parseMixed(s) ?? parseSlash(s);
}

function quotient(top: string, bottom: string): Rational | null {
  const a = parseSimple(top);
  const b = parseSimple(bottom);
  return a && b ? div(a, b) : null;
}

/**
 * O'quvchi yoki ustoz yozgan sonni aniq kasrga aylantiradi (BR-M04).
 * Qabul qiladi: `3`, `-0.75`, `0,75`, `3/4`, `-3/4`, `1 1/2`, `\frac{3}{4}`, `-\dfrac{3}{4}`, `$\frac{1}{2}$`.
 * Tanimasa yoki maxraj 0 bo'lsa null.
 */
export function parseNumber(input: string): Rational | null {
  const s = normalize(input);
  if (!s || s.length > 64) return null;
  // Butun ifodani o'rab turgan bitta qavs: (3/4), (\frac{2}{3})
  const inner = /^\((.*)\)$/.exec(s)?.[1]?.trim() ?? s;
  return parseSimple(inner) ?? parseFraction(inner) ?? parseFraction(s);
}

/**
 * Son javobni tekshirish (BR-M04): ikkala tomon ham aniq kasr sifatida solishtiriladi.
 * tolerance berilsa, |berilgan - to'g'ri| <= tolerance bo'lsa ham to'g'ri.
 */
export function numbersEqual(given: string, expected: string, tolerance?: string): boolean {
  const a = parseNumber(given);
  const b = parseNumber(expected);
  if (!a || !b) return false;
  if (compare(a, b) === 0) return true;
  const tol = tolerance ? parseNumber(tolerance) : null;
  return tol !== null && compare(absR(sub(a, b)), absR(tol)) <= 0;
}
