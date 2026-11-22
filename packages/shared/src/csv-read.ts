/**
 * CSV o'qish (T-100): Excel'dan saqlangan fayl. BOM olib tashlanadi, ajratuvchi birinchi qatordan aniqlanadi
 * (; tab yoki ,). Qo'shtirnoq ichida ajratuvchi va yangi qator bo'lishi mumkin ("" = bitta qo'shtirnoq).
 * Har qator bilan fayldagi qator raqami (1 dan) qaytadi: xato xabarida ko'rsatish uchun. Bo'sh qatorlar tashlanadi.
 */
export interface CsvLine {
  line: number;
  cells: string[];
}

const BOM = "\u{FEFF}";

function detectSeparator(text: string): string {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (s: string) => first.split(s).length;
  return [";", "\t", ","].sort((a, b) => count(b) - count(a))[0] ?? ";";
}

/** Bizning eksport formulaga qarshi qo'ygan ' belgisini olib tashlaydi ('=1 → =1) */
const unescape = (v: string) => (/^'[=+\-@]/.test(v) ? v.slice(1) : v);

class Reader {
  readonly rows: CsvLine[] = [];
  private cells: string[] = [];
  private cur = "";
  private line = 1;
  private start = 1;

  constructor(private readonly sep: string) {}

  /** Qo'shtirnoqdan tashqaridagi belgi */
  plain(ch: string) {
    if (ch === this.sep) this.endCell();
    else if (ch === "\n") this.endRow();
    else if (ch !== "\r") this.cur += ch;
  }

  /** Qo'shtirnoq ichidagi belgi (yangi qator ham matnga kiradi) */
  quoted(ch: string) {
    if (ch === "\n") this.line++;
    this.cur += ch;
  }

  endRow() {
    this.endCell();
    if (this.cells.some((c) => c !== "")) this.rows.push({ line: this.start, cells: this.cells });
    this.cells = [];
    this.start = ++this.line;
  }

  private endCell() {
    this.cells.push(unescape(this.cur.trim()));
    this.cur = "";
  }
}

export function parseCsvTable(input: string): CsvLine[] {
  const text = input.startsWith(BOM) ? input.slice(BOM.length) : input;
  const r = new Reader(detectSeparator(text));
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? "";
    if (ch !== '"') {
      if (inQuotes) r.quoted(ch);
      else r.plain(ch);
    } else if (inQuotes && text[i + 1] === '"') {
      r.quoted('"');
      i++;
    } else inQuotes = !inQuotes;
  }
  r.endRow();
  return r.rows;
}
