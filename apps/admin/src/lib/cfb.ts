/**
 * T-165: eski Excel (.xls) fayli — OLE2 "Compound File" konteyneri (MS-CFB): ichida kichik fayl tizimi.
 * Faqat o'qish va faqat bitta nomli oqimni olish kerak.
 */
const SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const END = 0xfffffffe;
const FREE = 0xffffffff;

export class CfbError extends Error {}

interface Header {
  sectorSize: number;
  miniSectorSize: number;
  miniCutoff: number;
  firstDir: number;
  firstMiniFat: number;
  fatSectors: number[];
}

class Reader {
  readonly view: DataView;
  constructor(readonly data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  u16 = (o: number) => this.view.getUint16(o, true);
  u32 = (o: number) => this.view.getUint32(o, true);
}

function header(r: Reader): Header {
  if (r.data.length < 512 || SIGNATURE.some((b, i) => r.data[i] !== b))
    throw new CfbError("Fayl eski Excel (.xls) emas yoki buzilgan");
  const sectorSize = 1 << r.u16(0x1e);
  if (sectorSize !== 512 && sectorSize !== 4096) throw new CfbError("Excel fayli buzilgan");
  const fatSectors: number[] = [];
  for (let i = 0; i < 109; i++) fatSectors.push(r.u32(0x4c + i * 4));
  // Katta fayllarda FAT ro'yxati DIFAT sektorlarida davom etadi
  let difat = r.u32(0x44);
  const per = sectorSize / 4 - 1;
  for (let guard = 0; difat !== END && difat !== FREE && guard < 10_000; guard++) {
    const base = (difat + 1) * sectorSize;
    for (let i = 0; i < per; i++) fatSectors.push(r.u32(base + i * 4));
    difat = r.u32(base + per * 4);
  }
  return {
    sectorSize,
    miniSectorSize: 1 << r.u16(0x20),
    miniCutoff: r.u32(0x38),
    firstDir: r.u32(0x30),
    firstMiniFat: r.u32(0x3c),
    fatSectors: fatSectors.filter((s) => s !== FREE && s !== END),
  };
}

/** Sektorlar zanjiri: FAT bo'yicha END gacha; sikl yoki fayldan tashqariga chiqish — buzilgan fayl */
function chain(fat: Uint32Array, start: number, limit: number): number[] {
  const out: number[] = [];
  for (let s = start; s !== END; s = fat[s] ?? END) {
    if (s >= limit || out.length > limit) throw new CfbError("Excel fayli buzilgan");
    out.push(s);
  }
  return out;
}

function readChain(r: Reader, h: Header, fat: Uint32Array, start: number): Uint8Array {
  const limit = Math.floor(r.data.length / h.sectorSize);
  const sectors = chain(fat, start, limit);
  const out = new Uint8Array(sectors.length * h.sectorSize);
  sectors.forEach((s, i) => {
    const off = (s + 1) * h.sectorSize;
    out.set(r.data.subarray(off, off + h.sectorSize), i * h.sectorSize);
  });
  return out;
}

function fatOf(r: Reader, h: Header): Uint32Array {
  const per = h.sectorSize / 4;
  const fat = new Uint32Array(h.fatSectors.length * per);
  h.fatSectors.forEach((s, i) => {
    const off = (s + 1) * h.sectorSize;
    for (let j = 0; j < per; j++)
      fat[i * per + j] = off + j * 4 + 4 <= r.data.length ? r.u32(off + j * 4) : FREE;
  });
  return fat;
}

interface Entry {
  name: string;
  type: number;
  start: number;
  size: number;
}

function entries(dir: Uint8Array): Entry[] {
  const r = new Reader(dir);
  const out: Entry[] = [];
  for (let off = 0; off + 128 <= dir.length; off += 128) {
    const len = Math.min(64, r.u16(off + 0x40));
    let name = "";
    for (let i = 0; i + 2 < len; i += 2) name += String.fromCharCode(r.u16(off + i));
    out.push({ name, type: dir[off + 0x42] ?? 0, start: r.u32(off + 0x74), size: r.u32(off + 0x78) });
  }
  return out;
}

/** Konteynerdagi oqim (masalan "Workbook") baytlari; topilmasa null */
export function readCfbStream(data: Uint8Array, names: string[]): { name: string; bytes: Uint8Array } | null {
  const r = new Reader(data);
  const h = header(r);
  const fat = fatOf(r, h);
  const list = entries(readChain(r, h, fat, h.firstDir));
  const entry = list.find((e) => e.type === 2 && names.includes(e.name));
  if (!entry) return null;
  if (entry.size >= h.miniCutoff) {
    return { name: entry.name, bytes: readChain(r, h, fat, entry.start).subarray(0, entry.size) };
  }
  // Kichik oqim: ildiz yozuvidagi "mini stream" ichida, 64 baytli bo'laklarda
  const root = list.find((e) => e.type === 5);
  if (!root) throw new CfbError("Excel fayli buzilgan");
  const mini = readChain(r, h, fat, root.start);
  const miniFatBytes = readChain(r, h, fat, h.firstMiniFat);
  const miniFat = new Uint32Array(miniFatBytes.length / 4);
  const mr = new Reader(miniFatBytes);
  for (let i = 0; i < miniFat.length; i++) miniFat[i] = mr.u32(i * 4);
  const parts = chain(miniFat, entry.start, Math.floor(mini.length / h.miniSectorSize));
  const out = new Uint8Array(parts.length * h.miniSectorSize);
  parts.forEach((s, i) =>
    out.set(mini.subarray(s * h.miniSectorSize, (s + 1) * h.miniSectorSize), i * h.miniSectorSize),
  );
  return { name: entry.name, bytes: out.subarray(0, entry.size) };
}
