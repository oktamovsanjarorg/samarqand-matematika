/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Pieces, readXls, rkValue } from "./xls";

const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

/** Fayllar xlwt (mustaqil kutubxona) bilan yaratilgan: fixtures/make-xls.py */
describe("Eski Excel (.xls) o'qish (T-165)", () => {
  it("birinchi varaq: o'zbekcha matn, sonlar, bo'sh kataklar; ikkinchi varaq o'qilmaydi", () => {
    expect(readXls(fixture("offline.xls"))).toEqual([
      ["F.I.O", "Telefon", "Algebra", "Geometriya", "Izoh"],
      ["Oʻktam Gʻaniyev", "998901112233", 12, 7.5, 'a&b <c> "d"'],
      ["Ali", null, -3, 0.1],
      // xlwt bo'sh matnni bo'sh katak (BLANK) qilib yozadi
      ["Vali", null, 1000000, 123456789.25, "1;2,3"],
    ]);
  });

  it("katta satrlar jadvali bir necha yozuvga bo'lingan bo'lsa ham hamma qator to'g'ri", () => {
    const rows = readXls(fixture("big.xls"));
    expect(rows).toHaveLength(600);
    for (const i of [0, 1, 39, 40, 299, 599])
      expect(rows[i]).toEqual([`Oʻquvchi ${i} ${"x".repeat(i % 40)}`, i]);
  });

  it("RK sonlar: butun, manfiy, /100 bayroqli, kasr", () => {
    expect(rkValue((5 << 2) | 2)).toBe(5);
    expect(rkValue((-7 << 2) | 2)).toBe(-7);
    expect(rkValue((1234 << 2) | 3)).toBe(12.34);
    // 0.5 double: yuqori 32 bit 0x3FE00000
    expect(rkValue(0x3fe00000)).toBe(0.5);
  });

  it("Excel emas yoki buzilgan fayl: tushunarli xato", () => {
    expect(() => readXls(new TextEncoder().encode("ism;ball\nAli;5"))).toThrow("eski Excel (.xls) emas");
    const broken = fixture("offline.xls").slice(0, 1024);
    expect(() => readXls(broken)).toThrow();
  });

  it("birinchi varaq diagramma bo'lsa, keyingi oddiy varaq o'qiladi", () => {
    const b = fixture("offline.xls");
    const name = new TextEncoder().encode("Natijalar");
    const at = b.findIndex((_, i) => name.every((c, j) => b[i + j] === c));
    // BOUNDSHEET: pos(4) ko'rinish(1) tur(1) uzunlik(1) bayroq(1) nom — tur nomdan 3 bayt oldin
    b[at - 3] = 2;
    expect(readXls(b)).toEqual([["bu varaq oʻqilmaydi"]]);
  });

  it("satr: rich/ext qo'shimchalari o'tkaziladi; CONTINUE'da siqilgan → UTF-16 almashadi", () => {
    // "ab" (rich 1 run, ext 3 bayt), keyin "c"
    const one = new Uint8Array([
      2, 0, 0x0c, 1, 0, 3, 0, 0, 0, 0x61, 0x62, 1, 2, 3, 4, 9, 9, 9, 1, 0, 0, 0x63,
    ]);
    const p = new Pieces([one]);
    expect([p.string(), p.string()]).toEqual(["ab", "c"]);
    // "Oʻ": 1-bo'lakda "O" siqilgan, 2-bo'lak bayroq 1 (UTF-16) bilan "ʻ"
    const split = new Pieces([new Uint8Array([2, 0, 0, 0x4f]), new Uint8Array([1, 0xbb, 0x02])]);
    expect(split.string()).toBe("Oʻ");
  });
});
