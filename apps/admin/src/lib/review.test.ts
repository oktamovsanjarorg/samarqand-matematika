import type { ReviewItem } from "@samarqand/shared";
import { describe, expect, it } from "vitest";
import { filterItems, isFlagged } from "./review";

const item = (p: Partial<ReviewItem>) =>
  ({ ai: null, signals: { sameWrong: 0, historyJump: false }, decision: null, ...p }) as ReviewItem;

describe("BR-W05: ustoz navbati filtrlari", () => {
  it("shubha yoki signal — belgilangan; hal qilinmaganlar", () => {
    const flagged = item({ signals: { sameWrong: 1, historyJump: false } });
    const done = item({ decision: { points: 1, note: null, reviewedAt: "", reviewer: "" } });
    const plain = item({});
    expect(isFlagged(flagged)).toBe(true);
    expect(isFlagged(plain)).toBe(false);
    expect(filterItems([flagged, done, plain], "TODO")).toEqual([flagged, plain]);
    expect(filterItems([flagged, done, plain], "FLAGGED")).toEqual([flagged]);
  });
});
