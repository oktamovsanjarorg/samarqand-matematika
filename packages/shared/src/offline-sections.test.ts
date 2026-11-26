import { describe, expect, it } from "vitest";
import {
  formatQuestionList,
  parseQuestionList,
  parseSectionsText,
  sectionScores,
  sectionsToText,
  weakestSection,
} from "./offline-sections";

describe("fan bo'limlari matni (T-180)", () => {
  it("savol ro'yxati: oraliq, vergul, takror", () => {
    expect(parseQuestionList("1-3, 7 ; 5–6, 3")).toEqual([1, 2, 3, 5, 6, 7]);
    expect(formatQuestionList([7, 1, 2, 3, 5])).toBe("1–3, 5, 7");
    expect(() => parseQuestionList("1-a")).toThrow("tushunilmadi");
    expect(() => parseQuestionList("5-2")).toThrow("teskari");
  });

  it("har qator «Nom: savollar», nomda ikki nuqta bo'lishi mumkin", () => {
    const text = "Algebra: 1-3\n\nGeometriya: Planimetriya: 4, 5\n";
    const list = parseSectionsText(text, 5);
    expect(list).toEqual([
      { title: "Algebra", questions: [1, 2, 3] },
      { title: "Geometriya: Planimetriya", questions: [4, 5] },
    ]);
    expect(sectionsToText(list)).toBe("Algebra: 1–3\nGeometriya: Planimetriya: 4–5");
  });

  it("xatolar: ikki nuqta yo'q, savol testda yo'q, savol ikki bo'limda", () => {
    expect(() => parseSectionsText("Algebra 1-3")).toThrow("1-qator");
    expect(() => parseSectionsText("A: 1-6", 5)).toThrow("testda 5 ta savol, 6 yoʻq");
    expect(() => parseSectionsText("A: 1-3\nB: 3-4")).toThrow("3-savol ikki boʻlimda: «A» va «B»");
  });
});

describe("sectionScores", () => {
  const sections = [
    { title: "Algebra", questions: [1, 2] },
    { title: "Geometriya", questions: [3, 4] },
  ];

  it("to'g'ri/xato/bo'sh, foiz; ball teng og'irlikda yechilgan savollar ulushi", () => {
    const s = sectionScores(sections, "cwcb", 60);
    expect(s[0]).toMatchObject({ correct: 1, wrong: 1, blank: 0, max: 2, percent: 50, points: 30 });
    expect(s[1]).toMatchObject({ correct: 1, wrong: 0, blank: 1, percent: 50, points: 30 });
  });

  it("og'irlik bilan: bo'lim ballari yig'indisi test baliga teng", () => {
    const s = sectionScores(sections, "ccbc", 50, [1, 1, 1, 2]);
    expect(s.map((x) => x.points)).toEqual([25, 25]);
    expect(s.reduce((a, x) => a + x.points, 0)).toBeCloseTo(50);
    expect(sectionScores(sections, "wwww", 10).every((x) => x.points === 0)).toBe(true);
  });

  it("eng zaif bo'lim: foizi eng past", () => {
    expect(weakestSection(sectionScores(sections, "ccwb", 40))?.title).toBe("Geometriya");
    expect(weakestSection(sectionScores(sections, "cccc", 75))).toBeNull();
  });
});
