/**
 * Ifoda yozuvini parser tushunadigan oddiy ko'rinishga keltiradi (T-074).
 * O'quvchi `2(x+1)`, `x²−1`, `\frac{x}{2}`, `√x`, `0,5x` deb yozishi mumkin.
 * Tushunilmaydigan LaTeX buyrug'i qolsa null: bunday javob ustozga tushadi.
 */

const UNICODE: [RegExp, string][] = [
  [/[−–]/g, "-"],
  [/[·×]/g, "*"],
  [/÷/g, "/"],
  [/²/g, "^2"],
  [/³/g, "^3"],
  [/√/g, "sqrt"],
  [/π/g, "pi"],
];

const LATEX: [RegExp, string][] = [
  [/\\left|\\right/g, ""],
  [/\\[,;:! ]/g, ""],
  [/\\cdot|\\times/g, "*"],
  [/\\div/g, "/"],
  [/\\(sqrt|sin|cos|tan|cot|ln|log|exp|pi)(?![a-z])/g, "$1"],
];

/** `{` dan boshlanadigan guruh: ichidagi matn va guruhdan keyingi indeks */
function group(s: string, at: number): { inner: string; end: number } | null {
  if (s[at] !== "{") return null;
  let depth = 0;
  for (let i = at; i < s.length; i++) {
    depth += s[i] === "{" ? 1 : s[i] === "}" ? -1 : 0;
    if (depth === 0) return { inner: s.slice(at + 1, i), end: i + 1 };
  }
  return null;
}

/** `\frac{a}{b}` (dfrac, tfrac) → `((a)/(b))`; noto'g'ri yozilgan bo'lsa null */
function fractions(input: string): string | null {
  let s = input;
  for (let m = /\\[dt]?frac/.exec(s); m; m = /\\[dt]?frac/.exec(s)) {
    const num = group(s, m.index + m[0].length);
    const den = num && group(s, num.end);
    if (!num || !den) return null;
    s = `${s.slice(0, m.index)}((${num.inner})/(${den.inner}))${s.slice(den.end)}`;
  }
  return s;
}

export function normalizeExpression(input: string): string | null {
  let s = input.trim().replace(/^\$+|\$+$/g, "");
  for (const [re, to] of [...UNICODE, ...LATEX]) s = s.replace(re, to);
  const f = fractions(s);
  if (f === null || f.includes("\\")) return null;
  return f
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/(\d),(\d)/g, "$1.$2");
}
