import type { ReviewItem } from "@samarqand/shared";
import { describe, expect, it } from "vitest";
import { filterItems, isFlagged, ofQuestion, questionChoices } from "./review";

const item = (p: Partial<ReviewItem>) =>
  ({
    ai: null,
    signals: { sameWrong: 0, historyJump: false, away: null },
    decision: null,
    ...p,
  }) as ReviewItem;

describe("BR-W05: ustoz navbati filtrlari", () => {
  it("shubha yoki signal — belgilangan; hal qilinmaganlar", () => {
    const flagged = item({ signals: { sameWrong: 1, historyJump: false, away: null } });
    const done = item({ decision: { points: 1, note: null, reviewedAt: "", reviewer: "" } });
    const plain = item({});
    expect(isFlagged(flagged)).toBe(true);
    expect(isFlagged(plain)).toBe(false);
    expect(filterItems([flagged, done, plain], "TODO")).toEqual([flagged, plain]);
    expect(filterItems([flagged, done, plain], "FLAGGED")).toEqual([flagged]);
  });
});

describe("T-102: savol bo'yicha tekshirish", () => {
  it("savollar tartib raqami bilan bir martadan; tanlanganda faqat o'sha savol", () => {
    const a2 = item({ questionId: "q2", order: 1, attemptId: "a" });
    const a1 = item({ questionId: "q1", order: 0, attemptId: "a" });
    const b2 = item({ questionId: "q2", order: 1, attemptId: "b" });
    expect(questionChoices([a2, a1, b2])).toEqual([
      { id: "q1", n: 1 },
      { id: "q2", n: 2 },
    ]);
    expect(ofQuestion([a2, a1, b2], "q2")).toEqual([a2, b2]);
    expect(ofQuestion([a2, a1, b2], "")).toEqual([a2, a1, b2]);
  });
});
