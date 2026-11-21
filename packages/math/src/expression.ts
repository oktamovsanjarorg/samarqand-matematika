import { normalizeExpression } from "./expression-text";

/**
 * Ifoda javobini tekshirish (T-074, ADR-0003): o'z kichik parserimiz, eval yo'q.
 * Grammatika: + - * / ^, qavslar, yashirin ko'paytirish (2x, 2(x+1), (x-1)(x+1)),
 * bir harfli o'zgaruvchilar, pi va e, sqrt sin cos tan cot ln log abs exp.
 * Ikki ifoda bir xil tasodifiy (lekin doimiy urug'li) nuqtalarda hisoblanib solishtiriladi.
 */

type Fn = (env: Record<string, number>) => number;
/** s: ko'rsatish uchun asl yozuv (0.5, \\pi) */
type Token = { t: "num"; v: number; s: string } | { t: "var" | "fn" | "op"; v: string };
/** Tugun: qiymat funksiyasi va LaTeX ko'rinishi; inner: qavs ichidagisi (kasr va darajada qavssiz yoziladi) */
interface N {
  f: Fn;
  tex: string;
  inner?: string;
}
const bare = (n: N) => n.inner ?? n.tex;

const FUNCS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  cot: (x) => 1 / Math.tan(x),
  ln: Math.log,
  log: Math.log10,
  abs: Math.abs,
  exp: Math.exp,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };
const TEX_CONST: Record<string, string> = { pi: "\\pi" };
const WORDS = [...Object.keys(FUNCS), ...Object.keys(CONSTS)].sort((a, b) => b.length - a.length);
const MAX_LENGTH = 200;

/** Joriy pozitsiyadagi token va uning uzunligi; bo'shliqda token null; tanilmasa butun natija null */
function next(s: string, i: number): { tok: Token | null; len: number } | null {
  const ch = s[i] ?? "";
  if (/\s/.test(ch)) return { tok: null, len: 1 };
  const num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
  if (num) return { tok: { t: "num", v: Number(num[1]), s: num[0] }, len: num[0].length };
  if ("+-*/^()".includes(ch)) return { tok: { t: "op", v: ch }, len: 1 };
  const w = WORDS.find((x) => s.startsWith(x, i));
  if (w)
    return {
      tok: w in FUNCS ? { t: "fn", v: w } : { t: "num", v: CONSTS[w] ?? NaN, s: TEX_CONST[w] ?? w },
      len: w.length,
    };
  return /[a-z]/i.test(ch) ? { tok: { t: "var", v: ch.toLowerCase() }, len: 1 } : null;
}

export function tokenize(s: string): Token[] | null {
  const out: Token[] = [];
  for (let i = 0; i < s.length;) {
    const n = next(s, i);
    if (!n) return null;
    if (n.tok) out.push(n.tok);
    i += n.len;
  }
  return out;
}

const STARTS_OPERAND = (t: Token | undefined) => !!t && (t.t !== "op" || t.v === "(");

/** Rekursiv tushish: expr → term → unary → power → primary */
class Parser {
  private i = 0;
  readonly vars = new Set<string>();
  constructor(private readonly toks: Token[]) {}

  private peek = () => this.toks[this.i];
  private isOp = (v: string) => this.peek()?.t === "op" && this.peek()?.v === v;

  parse(): N | null {
    const n = this.expr();
    return this.i === this.toks.length ? n : null;
  }

  private take = () => this.toks[this.i++]?.v;

  private expr(): N {
    let n = this.term();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.take();
      const [a, b] = [n.f, this.term()];
      n = { f: op === "-" ? (e) => a(e) - b.f(e) : (e) => a(e) + b.f(e), tex: `${n.tex} ${op} ${b.tex}` };
    }
    return n;
  }

  private term(): N {
    let n = this.unary();
    for (;;) {
      const op = this.isOp("*") || this.isOp("/") ? this.take() : STARTS_OPERAND(this.peek()) ? "" : null;
      if (op === null) return n;
      const [a, b] = [n, this.unary()];
      if (op === "/") n = { f: (e) => a.f(e) / b.f(e), tex: `\\frac{${bare(a)}}{${bare(b)}}` };
      else {
        const dot = op === "*" || /^[\d.]/.test(b.tex);
        n = { f: (e) => a.f(e) * b.f(e), tex: `${a.tex}${dot ? " \\cdot " : " "}${b.tex}` };
      }
    }
  }

  private unary(): N {
    if (this.isOp("-") || this.isOp("+")) {
      const minus = this.take() === "-";
      const a = this.unary();
      return minus ? { f: (e) => -a.f(e), tex: `-${a.tex}` } : a;
    }
    return this.power();
  }

  private power(): N {
    const base = this.primary();
    if (!this.isOp("^")) return base;
    this.i++;
    const exp = this.unary();
    return { f: (e) => Math.pow(base.f(e), exp.f(e)), tex: `{${base.tex}}^{${bare(exp)}}` };
  }

  private primary(): N {
    const t = this.toks[this.i++];
    if (t?.t === "num") return { f: () => t.v, tex: t.s };
    if (t?.t === "var") return this.variable(t.v);
    if (t?.t === "fn") return this.call(t.v);
    if (t?.t === "op" && t.v === "(") return this.group();
    throw new Error("kutilmagan belgi");
  }

  /** Funksiya argumenti qavsda yoki qavssiz (sin x, sqrt2) */
  private call(name: string): N {
    const fn = FUNCS[name] ?? Math.abs;
    const arg = this.isOp("(") ? this.primary() : this.power();
    const tex =
      name === "sqrt"
        ? `\\sqrt{${bare(arg)}}`
        : name === "abs"
          ? `\\left|${bare(arg)}\\right|`
          : `\\${name} ${arg.tex}`;
    return { f: (e) => fn(arg.f(e)), tex };
  }

  private group(): N {
    const inner = this.expr();
    if (!this.isOp(")")) throw new Error("qavs yopilmagan");
    this.i++;
    return { f: inner.f, tex: `\\left(${inner.tex}\\right)`, inner: inner.tex };
  }

  private variable(name: string): N {
    this.vars.add(name);
    return { f: (e) => e[name] ?? NaN, tex: name };
  }
}

export interface ParsedExpression {
  fn: Fn;
  vars: Set<string>;
  /** Ko'rsatish uchun LaTeX (T-077) */
  tex: string;
}

/** Ifodani o'qiydi; tushunilmasa null */
export function parseExpression(input: string): ParsedExpression | null {
  const text = normalizeExpression(input);
  const toks = text && text.length <= MAX_LENGTH ? tokenize(text) : null;
  if (!toks?.length) return null;
  try {
    const p = new Parser(toks);
    const n = p.parse();
    return n ? { fn: n.f, vars: p.vars, tex: n.tex } : null;
  } catch {
    return null;
  }
}

/** Doimiy urug'li tasodifiy sonlar (mulberry32): natija har safar bir xil chiqadi */
function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POINTS = 24;
const MIN_VALID = 6;
const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * Ikki ifoda tengmi: o'zgaruvchilar [-2.5; 2.5] oralig'idagi 24 nuqtada.
 * Ikkalasi ham aniqlanmagan nuqta (masalan manfiy sonning ildizi) tashlab ketiladi.
 * Ifoda o'qilmasa yoki aniqlangan nuqta 6 tadan kam bo'lsa null: ustoz tekshiradi.
 */
export function expressionsEqual(given: string, expected: string): boolean | null {
  const a = parseExpression(given);
  const b = parseExpression(expected);
  if (!a || !b) return null;
  const vars = [...new Set([...a.vars, ...b.vars])];
  const rnd = random(20261121);
  let valid = 0;
  for (let k = 0; k < POINTS; k++) {
    const env = Object.fromEntries(vars.map((v) => [v, rnd() * 5 - 2.5]));
    const [x, y] = [a.fn(env), b.fn(env)];
    if (!Number.isFinite(x) && !Number.isFinite(y)) continue;
    if (!close(x, y)) return false;
    valid++;
  }
  return valid >= MIN_VALID ? true : null;
}
