import { describe, expect, it } from "vitest";
import { parseOfflineCsv, phoneKey } from "./offline";

describe("parseOfflineCsv (T-056)", () => {
  it("Excel ; ajratuvchi, BOM, o'nlik vergul, bo'sh katak 0, qo'shtirnoq", () => {
    const csv =
      '\uFEFFF.I.O;Telefon;Algebra;Geometriya\r\nAli Valiyev;+998 90 123 45 67;12,5;8\r\n"Karimov; Aziz";;7;\r\n\r\n';
    const r = parseOfflineCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.sections).toEqual(["Algebra", "Geometriya"]);
    expect(r.rows).toEqual([
      { line: 2, name: "Ali Valiyev", phone: "+998 90 123 45 67", scores: [12.5, 8], total: 20.5 },
      { line: 3, name: "Karimov; Aziz", phone: null, scores: [7, 0], total: 7 },
    ]);
  });

  it("vergul ajratuvchi, telefon ustunisiz", () => {
    const r = parseOfflineCsv("Ism,1-bo'lim,2-bo'lim,3-bo'lim\nVali,1,2,3");
    expect(r.sections).toEqual(["1-bo'lim", "2-bo'lim", "3-bo'lim"]);
    expect(r.rows[0]).toMatchObject({ name: "Vali", phone: null, total: 6 });
  });

  it("xatolar: ism ustuni yo'q, son emas, ism bo'sh", () => {
    expect(parseOfflineCsv("Familya bor;A\nx;1").errors[0].message).toContain("ism ustuni");
    const r = parseOfflineCsv("Ism;A;B\nAli;1;abc\n;2;3\nVali;-1;0");
    expect(r.errors).toEqual([
      { line: 2, message: '2-boʻlim balli son emas: "abc"' },
      { line: 3, message: "Ism yoʻq" },
      { line: 4, message: '1-boʻlim balli son emas: "-1"' },
    ]);
    expect(parseOfflineCsv("").errors[0].message).toBe("Fayl boʻsh");
    expect(parseOfflineCsv("Ism;A\n").errors[0].message).toBe("Natija qatorlari yoʻq");
  });

  it("phoneKey: oxirgi 9 raqam", () => {
    expect(phoneKey("+998 (90) 123-45-67")).toBe("901234567");
    expect(phoneKey("901234567")).toBe("901234567");
    expect(phoneKey("12345")).toBeNull();
  });
});
