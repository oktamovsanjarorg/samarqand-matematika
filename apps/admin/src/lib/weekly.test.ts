import { describe, expect, it } from "vitest";
import { fromLocalInput, nextTitle, shiftedWindow, toLocalInput } from "./weekly";

describe("haftalik oyna vaqti (Toshkent)", () => {
  it("ISO ↔ datetime-local", () => {
    expect(toLocalInput("2026-11-22T19:00:00.000Z")).toBe("2026-11-23T00:00");
    expect(fromLocalInput("2026-11-29T23:59")).toBe("2026-11-29T18:59:00.000Z");
  });
});

describe("haftalik testdan nusxa (T-089)", () => {
  const opens = "2026-11-15T19:00:00.000Z"; // dushanba 00:00, Toshkent
  const closes = "2026-11-22T18:59:00.000Z";

  it("oyna kamida bir haftaga, ochilishi kelajakda bo'lguncha suriladi", () => {
    expect(shiftedWindow(opens, closes, new Date("2026-11-10T00:00:00Z"))).toEqual({
      opensAt: "2026-11-22T19:00:00.000Z",
      closesAt: "2026-11-29T18:59:00.000Z",
    });
    // 3 hafta o'tib nusxa olinsa ham keyingi dushanbadan ochiladi
    const w = shiftedWindow(opens, closes, new Date("2026-12-03T12:00:00Z"));
    expect(w).toEqual({ opensAt: "2026-12-06T19:00:00.000Z", closesAt: "2026-12-13T18:59:00.000Z" });
  });

  it("nomdagi raqam bittaga oshadi", () => {
    expect(nextTitle("48-hafta")).toBe("49-hafta");
    expect(nextTitle(" 9-hafta: kasrlar")).toBe("10-hafta: kasrlar");
    expect(nextTitle("Kasrlar")).toBe("");
  });
});
