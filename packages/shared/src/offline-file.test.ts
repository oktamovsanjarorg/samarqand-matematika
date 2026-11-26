import { describe, expect, it } from "vitest";
import { parseOfflineFile } from "./offline-file";

/** Skaner eksporti: 4 katak, oxirgi bo'lim "3-3" deb yozilgan, lekin 2 katak (a va b qismli ochiq savol) */
function omr(rows: [string, string[], string[]][]) {
  const head = ["Экзамен", "Имя", "Общая оценка", "Sertifikat -1-2", "Sertifikat -3-3"];
  for (let q = 1; q <= 4; q++) head.push(`Q ${q} Options`, `Q ${q} Key`, `Q ${q} Marks`);
  const lines = rows.map(([name, opts, marks]) => {
    const m = marks.map(Number);
    const cells = [
      "Mock 1",
      name,
      String(m.reduce((s, x) => s + x, 0)),
      String(m[0]! + m[1]!),
      String(m[2]! + m[3]!),
    ];
    for (let q = 0; q < 4; q++) cells.push(opts[q] ?? "", "A", marks[q] ?? "");
    return cells.join(",");
  });
  return "\uFEFF" + [head.join(","), ...lines].join("\r\n");
}

describe("parseOfflineFile: skaner eksporti (T-180)", () => {
  const file = omr([
    ["Ali Valiyev", ["A", "B", "12", ""], ["1", "0", "1", "0"]],
    ["Lola Karimova", ["", "A", "7", "3"], ["0", "1", "1", "1"]],
  ]);

  it("Marks 1 to'g'ri, belgilanmagan bo'sh, qolgani xato; imtihon nomi", () => {
    const f = parseOfflineFile(file);
    expect(f).toMatchObject({ format: "omr", exam: "Mock 1", questionCount: 4 });
    expect(f.rows).toEqual([
      { line: 2, name: "Ali Valiyev", phone: null, answers: "cwcb" },
      { line: 3, name: "Lola Karimova", phone: null, answers: "bccc" },
    ]);
  });

  it("oxirgi bo'lim fayldagi yig'indiga qarab oxirgi katakkacha cho'ziladi", () => {
    expect(parseOfflineFile(file).sections).toEqual([
      { title: "1–2-savollar", questions: [1, 2] },
      { title: "3–3-savollar", questions: [3, 4] },
    ]);
  });

  it("savol ustuni tushib qolsa xato", () => {
    expect(() => parseOfflineFile("Имя;Q 1 Marks;Q 3 Marks\nAli;1;0")).toThrow("2-savol ustuni yoʻq");
  });
});

describe("parseOfflineFile: Q1..Qn matritsa", () => {
  it("; ajratuvchi, telefon, 1/0/bo'sh", () => {
    const f = parseOfflineFile(
      'F.I.O;Telefon;Q1;Q2;Q3;Jami\nAli;+998901234567;1;0;;1\n"Vali; Aka";;1;1;1;3\n',
    );
    expect(f).toMatchObject({ format: "matrix", exam: null, questionCount: 3, sections: [] });
    expect(f.rows).toEqual([
      { line: 2, name: "Ali", phone: "+998901234567", answers: "cwb" },
      { line: 3, name: "Vali; Aka", phone: null, answers: "ccc" },
    ]);
  });

  it("xatolar o'zbekcha: noto'g'ri katak, ism yo'q, bo'sh fayl, tanilmagan fayl", () => {
    expect(() => parseOfflineFile("Ism,Q1\nAli,2")).toThrow(
      '2-qator: katakda faqat 1, 0 yoki boʻsh boʻladi ("2")',
    );
    expect(() => parseOfflineFile("Ism,Q1\n,1")).toThrow("2-qator: ism yoʻq");
    expect(() => parseOfflineFile("")).toThrow("Fayl boʻsh");
    expect(() => parseOfflineFile("Ism,Q1\n")).toThrow("Natija qatorlari yoʻq");
    expect(() => parseOfflineFile("Ism;Algebra\nAli;5")).toThrow("Fayl tanilmadi");
  });
});
