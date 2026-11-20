import { describe, expect, it } from "vitest";
import { rankRows, shortName } from "./ranking";

describe("BR-W10: reyting", () => {
  it("teng ballga teng o'rin, keyingisi o'tkazib yuboriladi", () => {
    const r = rankRows([
      { name: "B", score: 5 },
      { name: "A", score: 7 },
      { name: "C", score: 5 },
      { name: "D", score: 1 },
    ]);
    expect(r.map((x) => [x.name, x.place])).toEqual([
      ["A", 1],
      ["B", 2],
      ["C", 2],
      ["D", 4],
    ]);
  });

  it("boshqalarga qisqa ism", () => {
    expect(shortName(" Aliyev  Vali Karimovich ")).toBe("Aliyev V.");
    expect(shortName("Vali")).toBe("Vali");
  });
});
