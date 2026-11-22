import { readCfbStream } from "./cfb";
import { XlsxError, type XlsxCell } from "./xlsx";

/**
 * T-165: eski Excel (.xls, BIFF8 — Excel 97–2003) faylining birinchi varag'ini o'qish.
 * Faqat qiymatlar: matn, son, mantiqiy, formulaning saqlangan natijasi. Natija readXlsx bilan bir xil ko'rinishda.
 */
const R = {
  BOF: 0x0809,
  EOF: 0x000a,
  FILEPASS: 0x002f,
  BOUNDSHEET: 0x0085,
  SST: 0x00fc,
  CONTINUE: 0x003c,
  LABELSST: 0x00fd,
  LABEL: 0x0204,
  NUMBER: 0x0203,
  RK: 0x027e,
  MULRK: 0x00bd,
  BOOLERR: 0x0205,
  FORMULA: 0x0006,
  STRING: 0x0207,
} as const;

interface Rec {
  type: number;
  data: Uint8Array;
  /** Oqimdagi boshlanish joyi (BOUNDSHEET varaq BOF'ini shu bilan ko'rsatadi) */
  pos: number;
}

const dv = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);

function records(stream: Uint8Array): Rec[] {
  const v = dv(stream);
  const out: Rec[] = [];
  for (let pos = 0; pos + 4 <= stream.length;) {
    const type = v.getUint16(pos, true);
    const len = v.getUint16(pos + 2, true);
    out.push({ type, data: stream.subarray(pos + 4, pos + 4 + len), pos });
    pos += 4 + len;
  }
  return out;
}

/** RK: ixcham son. 2-bit: butun son (30 bit), aks holda double'ning yuqori 30 biti; 1-bit: /100 */
export function rkValue(rk: number): number {
  let n: number;
  if (rk & 2) n = rk >> 2;
  else {
    const b = new DataView(new ArrayBuffer(8));
    b.setUint32(4, rk & 0xfffffffc, true);
    n = b.getFloat64(0, true);
  }
  return rk & 1 ? n / 100 : n;
}

/**
 * Bir necha yozuvga bo'lingan ma'lumotni o'qish: SST va STRING CONTINUE bilan davom etadi.
 * Belgilar CONTINUE chegarasida bo'linsa, yangi bo'lak 1 baytli bayroq (siqilgan/UTF-16) bilan boshlanadi.
 */
export class Pieces {
  private i = 0;
  private pos = 0;
  constructor(private readonly parts: Uint8Array[]) {}

  private cur(): Uint8Array {
    while (this.i < this.parts.length && this.pos >= (this.parts[this.i]?.length ?? 0)) {
      this.i++;
      this.pos = 0;
    }
    const p = this.parts[this.i];
    if (!p) throw new XlsxError("Excel fayli buzilgan");
    return p;
  }
  u8(): number {
    const p = this.cur();
    return p[this.pos++] ?? 0;
  }
  u16(): number {
    return this.u8() | (this.u8() << 8);
  }
  u32(): number {
    return (this.u16() | (this.u16() << 16)) >>> 0;
  }
  skip(n: number) {
    for (let k = 0; k < n; k++) this.u8();
  }
  /** XLUnicodeRichExtendedString */
  string(): string {
    const cch = this.u16();
    const flags = this.u8();
    const runs = flags & 8 ? this.u16() : 0;
    const ext = flags & 4 ? this.u32() : 0;
    let wide = (flags & 1) === 1;
    let s = "";
    for (let k = 0; k < cch; k++) {
      // Bo'lak oxiri belgilar o'rtasida: keyingisi bayroq bilan boshlanadi
      if (this.pos >= (this.parts[this.i]?.length ?? 0)) {
        this.cur();
        wide = (this.u8() & 1) === 1;
      }
      s += String.fromCharCode(wide ? this.u16() : this.u8());
    }
    this.skip(runs * 4 + ext);
    return s;
  }
}

/** Yozuv va undan keyingi CONTINUE'lar */
function withContinues(recs: Rec[], i: number): Uint8Array[] {
  const parts = [recs[i]?.data ?? new Uint8Array()];
  for (let j = i + 1; recs[j]?.type === R.CONTINUE; j++) parts.push(recs[j]?.data ?? new Uint8Array());
  return parts;
}

function sharedStrings(recs: Rec[]): string[] {
  const i = recs.findIndex((r) => r.type === R.SST);
  if (i < 0) return [];
  const p = new Pieces(withContinues(recs, i));
  p.skip(4);
  const unique = p.u32();
  const out: string[] = [];
  for (let k = 0; k < unique; k++) out.push(p.string());
  return out;
}

/** Birinchi oddiy varaq (diagramma varag'i emas) boshlanishi */
function firstSheetPos(recs: Rec[]): number {
  for (const r of recs) {
    if (r.type !== R.BOUNDSHEET) continue;
    if (r.data[5] === 0) return dv(r.data).getUint32(0, true);
  }
  throw new XlsxError("Excel faylida varaq topilmadi");
}

type Put = (row: number, col: number, v: XlsxCell) => void;

/** FORMULA: natija 8 bayt; oxirgi 2 bayt 0xFFFF bo'lsa matn/mantiqiy/xato, aks holda son */
function formula(d: Uint8Array, recs: Rec[], i: number): XlsxCell {
  const v = dv(d);
  if (v.getUint16(12, true) !== 0xffff) return v.getFloat64(6, true);
  const kind = d[6];
  if (kind === 1) return d[8] ? "TRUE" : "FALSE";
  if (kind !== 0) return null;
  const next = recs.findIndex((r, j) => j > i && r.type === R.STRING);
  if (next < 0) return null;
  const p = new Pieces(withContinues(recs, next));
  return p.string();
}

/** MULRK: bir qatorda ketma-ket RK sonlar; har biri 6 bayt (xf + rk), oxirida oxirgi ustun */
function mulrk(v: DataView, len: number, put: Put) {
  const row = v.getUint16(0, true);
  const first = v.getUint16(2, true);
  const last = v.getUint16(len - 2, true);
  for (let c = first; c <= last; c++) put(row, c, rkValue(v.getUint32(4 + (c - first) * 6 + 2, true)));
}

/** Bitta katak yozuvining qiymati; katak bo'lmagan yozuv uchun undefined */
function value(r: Rec, recs: Rec[], i: number, sst: string[]): XlsxCell | undefined {
  const v = dv(r.data);
  switch (r.type) {
    case R.LABELSST:
      return sst[v.getUint32(6, true)] ?? null;
    case R.NUMBER:
      return v.getFloat64(6, true);
    case R.RK:
      return rkValue(v.getUint32(6, true));
    case R.LABEL:
      return new Pieces([r.data.subarray(6)]).string();
    case R.BOOLERR:
      return r.data[7] ? null : r.data[6] ? "TRUE" : "FALSE";
    case R.FORMULA:
      return formula(r.data, recs, i);
    default:
      return undefined;
  }
}

function cell(recs: Rec[], i: number, sst: string[], put: Put) {
  const r = recs[i];
  if (!r || r.data.length < 6) return;
  const v = dv(r.data);
  if (r.type === R.MULRK) return mulrk(v, r.data.length, put);
  const x = value(r, recs, i, sst);
  if (x !== undefined) put(v.getUint16(0, true), v.getUint16(2, true), x);
}

const isBlank = (r: XlsxCell[] | undefined) => !r || r.every((c) => c === null || c === "");

export function readXls(data: Uint8Array): XlsxCell[][] {
  const stream = readCfbStream(data, ["Workbook", "Book"]);
  if (!stream) throw new XlsxError("Fayl Excel jadvali emas");
  if (stream.name === "Book") throw new XlsxError("Juda eski Excel formati (95): faylni .xlsx qilib saqlang");
  const recs = records(stream.bytes);
  if (recs[0]?.type !== R.BOF) throw new XlsxError("Excel fayli buzilgan");
  if (recs.some((r) => r.type === R.FILEPASS))
    throw new XlsxError("Fayl parol bilan himoyalangan: parolsiz saqlang");
  const sst = sharedStrings(recs);
  const pos = firstSheetPos(recs);
  const rows: XlsxCell[][] = [];
  const put: Put = (row, col, v) => {
    while (rows.length <= row) rows.push([]);
    const r = rows[row] ?? [];
    while (r.length < col) r.push(null);
    r[col] = typeof v === "number" && !Number.isFinite(v) ? null : v;
  };
  const start = recs.findIndex((r) => r.pos === pos);
  if (start < 0) throw new XlsxError("Excel fayli buzilgan");
  for (let i = start + 1; i < recs.length && recs[i]?.type !== R.EOF; i++) cell(recs, i, sst, put);
  while (rows.length && isBlank(rows[rows.length - 1])) rows.pop();
  return rows;
}
