import { describe, expect, it } from "vitest";
import { questionInput } from "./question";

const options = [
  { id: "a", text: "1" },
  { id: "b", text: "2" },
];
const ok = (v: object) => questionInput.safeParse(v).success;

describe("questionInput", () => {
  it("to'g'ri savollar o'tadi", () => {
    expect(ok({ type: "SINGLE", text: "2+2?", options, answer: { optionId: "a" } })).toBe(true);
    expect(ok({ type: "NUMERIC", text: "?", answer: { value: "4" } })).toBe(true);
    expect(ok({ type: "WRITTEN", text: "Isbotlang" })).toBe(true);
    expect(
      ok({
        type: "MATCHING",
        text: "?",
        left: options,
        right: options,
        answer: { pairs: { a: "b", b: "a" } },
      }),
    ).toBe(true);
  });

  it("javob variantlar ichida bo'lishi shart", () => {
    expect(ok({ type: "SINGLE", text: "?", options, answer: { optionId: "z" } })).toBe(false);
    expect(ok({ type: "MULTIPLE", text: "?", options, answer: { optionIds: ["a", "a"] } })).toBe(false);
    expect(ok({ type: "MULTIPLE", text: "?", options, answer: { optionIds: [] } })).toBe(false);
  });

  it("takrorlangan kalit va to'liq bo'lmagan juftlar rad etiladi", () => {
    expect(
      ok({ type: "SINGLE", text: "?", options: [options[0], options[0]], answer: { optionId: "a" } }),
    ).toBe(false);
    expect(
      ok({ type: "MATCHING", text: "?", left: options, right: options, answer: { pairs: { a: "b" } } }),
    ).toBe(false);
  });

  it("bitta variantli savol va noma'lum tur rad etiladi", () => {
    expect(ok({ type: "SINGLE", text: "?", options: options.slice(0, 1), answer: { optionId: "a" } })).toBe(
      false,
    );
    expect(ok({ type: "ESSAY", text: "?" })).toBe(false);
    expect(ok({ type: "WRITTEN", text: "   " })).toBe(false);
  });
});
