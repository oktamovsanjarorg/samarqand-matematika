import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("T-076: Excel uchun CSV", () => {
  it("BOM, ; ajratuvchi, o'nlik vergul, bo'sh katak", () => {
    expect(
      toCsv([
        ["Ism", "Ball"],
        ["Oʻgʻil Bola", 52.5],
        ["Ali", null],
      ]),
    ).toBe("﻿Ism;Ball\r\nOʻgʻil Bola;52,5\r\nAli;\r\n");
  });

  it("maxsus belgilar qo'shtirnoqda, formula bajarilmaydi", () => {
    expect(toCsv([['A;B "C"', "=SUM(A1)", "-1", -1]])).toBe('﻿"A;B ""C""";\'=SUM(A1);\'-1;-1\r\n');
  });
});
