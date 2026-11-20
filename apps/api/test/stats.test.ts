import type { AttemptSummary } from "@samarqand/shared";
import { describe, expect, it } from "vitest";
import { averagePercent, topicTable } from "../src/topic-tests/stats";

const a = (topicId: string, correct: number, checkable: number): AttemptSummary => ({
  id: `${topicId}-${correct}`,
  topicId,
  topicTitle: topicId,
  correct,
  checkable,
  submittedAt: "2026-11-20T10:00:00.000Z",
});

describe("statistika", () => {
  it("mavzu bo'yicha eng yaxshi natija, pasti birinchi", () => {
    const rows = topicTable([a("kasr", 1, 4), a("kasr", 3, 4), a("tenglama", 1, 2), a("yozma", 0, 0)]);
    expect(rows).toEqual([
      { topicId: "tenglama", topicTitle: "tenglama", attempts: 1, bestPercent: 50 },
      { topicId: "kasr", topicTitle: "kasr", attempts: 2, bestPercent: 75 },
      { topicId: "yozma", topicTitle: "yozma", attempts: 1, bestPercent: null },
    ]);
  });

  it("o'rtacha foiz faqat tekshiriladiganlardan", () => {
    expect(averagePercent([a("x", 1, 2), a("y", 1, 1), a("z", 0, 0)])).toBe(75);
    expect(averagePercent([a("z", 0, 0)])).toBeNull();
    expect(averagePercent([])).toBeNull();
  });
});
