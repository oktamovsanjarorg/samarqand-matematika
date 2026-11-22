import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { XlsxError, readXlsx, writeXlsx } from "./xlsx";

/** Excel saqlagan faylga o'xshash: varaq rId3 orqali, umumiy matnlar (formatlangan bo'laklar bilan), bo'sh ustun va qator */
function excelLike() {
  const x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return zipSync({
    "xl/workbook.xml": strToU8(
      `${x}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Savollar" sheetId="1" r:id="rId3"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `${x}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="t/styles" Target="styles.xml"/><Relationship Id="rId3" Type="t/worksheet" Target="worksheets/sheet7.xml"/></Relationships>`,
    ),
    "xl/sharedStrings.xml": strToU8(
      `${x}<sst count="4" uniqueCount="4"><si><t>Tur</t></si><si><t>Savol</t></si><si><r><rPr><b/></rPr><t xml:space="preserve">$2+3$ </t></r><r><t>nechaga &amp; teng?</t></r></si><si><t>3/4</t></si></sst>`,
    ),
    "xl/worksheets/sheet7.xml": strToU8(
      `${x}<worksheet><sheetData><row r="1" spans="1:3"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="str"><v>bitta</v></c><c r="B2" t="s"><v>2</v></c><c r="D2" s="3"><v>998901234567</v></c><c r="E2" t="b"><v>1</v></c></row><row r="4"><c r="C4" t="inlineStr"><is><t>son</t></is></c><c r="D4" t="s"><v>3</v></c><c r="E4"><v>0.5</v></c></row><row r="6"><c r="A6" t="s"/></row></sheetData></worksheet>`,
    ),
  });
}

describe("xlsx (T-154)", () => {
  it("Excel faylini o'qiydi: umumiy matnlar, bo'sh kataklar, son, mantiqiy, oxiridagi bo'sh qator tashlanadi", () => {
    expect(readXlsx(excelLike())).toEqual([
      ["Tur", "Savol"],
      ["bitta", "$2+3$ nechaga & teng?", null, 998901234567, "TRUE"],
      [],
      [null, null, "son", "3/4", 0.5],
    ]);
  });

  it("yozilgan fayl qayta o'qilganda o'sha qatorlar (maxsus belgilar, uzun matn, son)", () => {
    const rows = [
      ["Ism", "Ball", "Izoh"],
      ["Ali <Vali> & “Qodir”", 17.5, "1-qator\n2-qator"],
      ["Oʻgʻiloy", 0, null],
    ];
    expect(readXlsx(writeXlsx(rows, "Natijalar: 7/9"))).toEqual(
      rows.map((r) => r.slice(0, r[2] === null ? 2 : 3)),
    );
  });

  it("xlsx bo'lmagan fayl tushunarli xato beradi", () => {
    expect(() => readXlsx(strToU8("Tur,Savol\nbitta,2+2"))).toThrow(XlsxError);
  });
});
