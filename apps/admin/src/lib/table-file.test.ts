/// <reference types="node" />
import { readFileSync } from "node:fs";
import { toCsv } from "@samarqand/shared";
import { describe, expect, it } from "vitest";
import { kindOf, readHtmlTable, tableText } from "./table-file";
import { writeXlsx } from "./xlsx";

const enc = (s: string) => new TextEncoder().encode(s);
const xls = new Uint8Array(readFileSync(new URL("./fixtures/offline.xls", import.meta.url)));

describe("Jadval fayl turi ichidan aniqlanadi (T-165)", () => {
  it("xlsx, xls, HTML, matn", () => {
    expect(kindOf(writeXlsx([["a"]]))).toBe("xlsx");
    expect(kindOf(xls)).toBe("xls");
    expect(kindOf(enc("  <html><table>"))).toBe("html");
    expect(kindOf(enc("<TABLE border=1>"))).toBe("html");
    expect(kindOf(enc("Ism;Ball\nAli;<5>"))).toBe("text");
  });

  it("nomi .xls bo'lgan .xlsx va haqiqiy .xls bir xil CSV beradi", async () => {
    const rows = [
      ["F.I.O", "Ball"],
      ["Ali", 5],
    ];
    expect(await tableText(writeXlsx(rows))).toBe(toCsv(rows));
    const csv = await tableText(xls);
    expect(csv.split(/\r?\n/)[0]).toBe("\ufeffF.I.O;Telefon;Algebra;Geometriya;Izoh");
    expect(csv).toContain("Oʻktam Gʻaniyev;998901112233;12;7,5");
  });

  it("HTML jadval: teglar, entity, <br>, yopilmagan <td>; bo'sh katak null", () => {
    const html = `<html><body><p>Hisobot</p><table>
      <tr><th>F.I.O</th><th>Ball</th><th>Izoh</th></tr>
      <tr><td><b>Ali</b>&nbsp;Valiyev</td><td>7,5<td>a &amp; b<br>c</tr>
      <tr><td>Vali</td><td></td></tr>
      <tr><td></td></tr>
    </table><table><tr><td>ikkinchi</td></tr></table>`;
    expect(readHtmlTable(html)).toEqual([
      ["F.I.O", "Ball", "Izoh"],
      ["Ali Valiyev", "7,5", "a & b c"],
      ["Vali", null],
    ]);
  });

  it("nomi Excel, ichi jadval emas: xato (CSV deb o'qilmaydi); .csv nomli matn o'qiladi", async () => {
    await expect(tableText(enc("emas"), "buzuq.xlsx")).rejects.toThrow(
      "Fayl Excel (.xlsx) emas yoki buzilgan",
    );
    await expect(tableText(enc("emas"), "eski.XLS")).rejects.toThrow("emas yoki buzilgan");
    expect(await tableText(enc("Ism;Ball"), "natija.csv")).toBe("Ism;Ball");
  });
});
