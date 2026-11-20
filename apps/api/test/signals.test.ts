import { describe, expect, it } from "vitest";
import { historyJump, sameWrongAnswers } from "../src/weekly/signals";

describe("ko'chirish signallari (serverda)", () => {
  it("bir xil noto'g'ri javob: kamida ikki o'quvchi; to'g'ri javob va javobsiz hisobga olinmaydi", () => {
    const rows = [
      { userId: "a", questionId: "q1", response: { value: " 1/2 " }, result: "WRONG" as const },
      { userId: "b", questionId: "q1", response: { value: "1/2" }, result: "WRONG" as const },
      { userId: "c", questionId: "q1", response: { value: "3/4" }, result: "CORRECT" as const },
      { userId: "d", questionId: "q1", response: { value: "3/4" }, result: "CORRECT" as const },
      { userId: "e", questionId: "q1", response: { value: "2" }, result: "WRONG" as const },
      { userId: "f", questionId: "q2", response: { optionIds: ["b", "a"] }, result: "WRONG" as const },
      { userId: "g", questionId: "q2", response: { optionIds: ["a", "b"] }, result: "WRONG" as const },
      { userId: "h", questionId: "q2", response: null, result: "WRONG" as const },
    ];
    expect(Object.fromEntries(sameWrongAnswers(rows))).toEqual({ q1: [["a", "b"]], q2: [["f", "g"]] });
  });

  it("tarixdan keskin farq", () => {
    expect(historyJump(40, 100)).toBe(true);
    expect(historyJump(60, 100)).toBe(false);
    expect(historyJump(null, 100)).toBe(false);
    expect(historyJump(40, 80)).toBe(false);
  });
});
