export type Segment =
  { kind: "text"; value: string } | { kind: "inline"; value: string } | { kind: "display"; value: string };

/** Formula ichida bo'lishi mumkin bo'lgan eng uzun matn: undan uzuni oddiy matn deb qoldiriladi */
const MAX_FORMULA = 2000;

function pushText(out: Segment[], value: string) {
  if (!value) return;
  const last = out[out.length - 1];
  if (last?.kind === "text") last.value += value;
  else out.push({ kind: "text", value });
}

/** `\$` ni matn sifatida qoldirib, keyingi `delim` ni qidiradi */
function findClose(text: string, delim: string, from: number): number {
  let i = text.indexOf(delim, from);
  while (i > 0 && text[i - 1] === "\\") i = text.indexOf(delim, i + 1);
  return i;
}

/**
 * Matnni oddiy matn va formulalarga ajratadi: `$$...$$` alohida qator, `$...$` qator ichida.
 * `\$` dollar belgisi sifatida qoladi. Yopilmagan `$` oddiy matn bo'lib qoladi.
 */
export function splitMath(text: string): Segment[] {
  const out: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const open = findClose(text, "$", i);
    if (open < 0) break;
    pushText(out, text.slice(i, open).replace(/\\\$/g, "$"));
    const delim = text.startsWith("$$", open) ? "$$" : "$";
    const close = findClose(text, delim, open + delim.length);
    const body = close < 0 ? "" : text.slice(open + delim.length, close);
    if (close < 0 || !body.trim() || body.length > MAX_FORMULA) {
      pushText(out, delim);
      i = open + delim.length;
      continue;
    }
    out.push({ kind: delim === "$$" ? "display" : "inline", value: body });
    i = close + delim.length;
  }
  pushText(out, text.slice(i).replace(/\\\$/g, "$"));
  return out;
}
