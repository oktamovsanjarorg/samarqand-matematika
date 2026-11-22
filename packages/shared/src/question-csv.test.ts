import { describe, expect, it } from "vitest";
import { parseCsvTable } from "./csv-read";
import { toCsv } from "./csv";
import { parseQuestionCsv } from "./question-csv";

describe("parseCsvTable (T-100)", () => {
  it("BOM, ; ajratuvchi, qo'shtirnoq ichida yangi qator va qo'shtirnoq; qator raqami saqlanadi", () => {
    const text = '\u{FEFF}Savol;Javob\r\n"Birinchi\r\nqator ""muhim""";1\r\n\r\nIkkinchi;2\r\n';
    expect(parseCsvTable(text)).toEqual([
      { line: 1, cells: ["Savol", "Javob"] },
      { line: 2, cells: ['Birinchi\r\nqator "muhim"', "1"] },
      { line: 5, cells: ["Ikkinchi", "2"] },
    ]);
  });

  it("vergul va tab ajratuvchi aniqlanadi; o'z eksportimiz qaytib o'qiladi", () => {
    expect(parseCsvTable("a,b\n1,2")[1]?.cells).toEqual(["1", "2"]);
    expect(parseCsvTable("a\tb\n1\t2")[1]?.cells).toEqual(["1", "2"]);
    const back = parseCsvTable(toCsv([["Javob"], ["-3"], ["x;y"]]));
    expect(back.map((r) => r.cells[0])).toEqual(["Javob", "-3", "x;y"]);
  });
});

describe("parseQuestionCsv (T-100)", () => {
  const head = "Tur;Savol;A;B;C;Javob;Yechim;Qiyinlik;Teglar";

  it("turlar: aniq yozilgan va bo'sh turda aniqlanadigan", () => {
    const csv = [
      head,
      "bitta;$2+2$ = ?;3;4;5;B;;oson;arifmetika",
      ";Juft sonlar;2;3;4;a, c;;;",
      "Son javob;$\\frac12+\\frac14$;;;;3/4;;2;Kasr qoʻshish, ulush",
      ";Soddalang: $2(x+1)$;;;;2x+2;;;",
      ";Isbotlang: $\\sqrt2$ irratsional;;;;;Teskarisini faraz qilamiz;3;",
    ].join("\n");
    const r = parseQuestionCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => [x.line, x.input.type])).toEqual([
      [2, "SINGLE"],
      [3, "MULTIPLE"],
      [4, "NUMERIC"],
      [5, "EXPRESSION"],
      [6, "WRITTEN"],
    ]);
    expect(r.rows[0]?.input).toMatchObject({
      options: [
        { id: "a", text: "3" },
        { id: "b", text: "4" },
        { id: "c", text: "5" },
      ],
      answer: { optionId: "b" },
      difficulty: 1,
      skills: ["arifmetika"],
    });
    expect(r.rows[1]?.input).toMatchObject({ answer: { optionIds: ["a", "c"] } });
    expect(r.rows[2]?.input).toMatchObject({ answer: { value: "3/4" }, skills: ["kasr-qoshish", "ulush"] });
  });

  it("xatolar qator raqami bilan; to'g'ri qatorlar baribir o'qiladi", () => {
    const csv = [
      head,
      "bitta;Savol;1;2;;D;;;",
      "jadval;Savol;;;;1;;;",
      ";;;;;1;;;",
      ";Toʻgʻri savol;;;;5;;9;",
      ";Yaxshi;;;;7;;;",
    ].join("\n");
    const r = parseQuestionCsv(csv);
    expect(r.rows.map((x) => x.line)).toEqual([6]);
    expect(r.errors).toEqual([
      { line: 2, message: "Javob: Javob variantlar ichida yoʻq" },
      { line: 3, message: "Tur tushunilmadi: «jadval» (bitta, bir nechta, son, ifoda yoki yozma)" },
      { line: 4, message: "Savol: Savol matni kerak" },
      { line: 5, message: "Qiyinlik: 1, 2, 3 yoki oson, oʻrta, qiyin" },
    ]);
  });

  it("sarlavhada Savol bo'lmasa yoki fayl bo'sh bo'lsa tushunarli xato", () => {
    expect(parseQuestionCsv("Javob;A\n1;2").errors[0]?.message).toContain("«Savol» ustuni");
    expect(parseQuestionCsv("").errors).toEqual([{ line: 1, message: "Fayl boʻsh" }]);
  });
});
