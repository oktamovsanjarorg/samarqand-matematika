import type { QuestionView } from "@samarqand/shared";
import { describe as suite, expect, it } from "vitest";
import { describe, isAnswered } from "./answers";

const single: QuestionView = {
  id: "q",
  type: "SINGLE",
  text: "?",
  options: [
    { id: "a", text: "1" },
    { id: "b", text: "2" },
  ],
};
const matching: QuestionView = {
  id: "m",
  type: "MATCHING",
  text: "?",
  left: [
    { id: "a", text: "x" },
    { id: "b", text: "y" },
  ],
  right: [
    { id: "1", text: "1" },
    { id: "2", text: "2" },
  ],
};

suite("javob yordamchilari", () => {
  it("javob berilganini aniqlaydi", () => {
    expect(isAnswered(single, null)).toBe(false);
    expect(isAnswered(single, { optionId: "a" })).toBe(true);
    expect(isAnswered(single, { optionIds: [] })).toBe(false);
    expect(isAnswered(single, { value: "  " })).toBe(false);
    expect(isAnswered(matching, { pairs: { a: "1" } })).toBe(false);
    expect(isAnswered(matching, { pairs: { a: "1", b: "2" } })).toBe(true);
  });

  it("javobni matn qiladi", () => {
    expect(describe(single, { optionId: "b" })).toBe("B) 2");
    expect(describe(single, { optionIds: ["a", "b"] })).toBe("A) 1; B) 2");
    expect(describe(matching, { pairs: { b: "1" } })).toBe("B → 1");
    expect(describe(single, { value: "3/4" })).toBe("3/4");
    expect(describe(single, null)).toBeNull();
  });
});
