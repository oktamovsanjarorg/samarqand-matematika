import type { QuestionInput } from "@samarqand/shared";
import { describe, expect, it } from "vitest";
import { toStorage, toView } from "../src/questions/codec";
import { checkAnswer } from "../src/questions/check";

const opts = [
  { id: "a", text: "1" },
  { id: "b", text: "2" },
  { id: "c", text: "3" },
];
const single: QuestionInput = { type: "SINGLE", text: "?", options: opts, answer: { optionId: "b" } };
const multi: QuestionInput = {
  type: "MULTIPLE",
  text: "?",
  options: opts,
  answer: { optionIds: ["a", "c"] },
};
const num: QuestionInput = { type: "NUMERIC", text: "?", answer: { value: "3/4" } };
const match: QuestionInput = {
  type: "MATCHING",
  text: "?",
  left: opts.slice(0, 2),
  right: opts,
  answer: { pairs: { a: "c", b: "a" } },
};

describe("checkAnswer", () => {
  it.each([
    [single, { optionId: "b" }, "CORRECT"],
    [single, { optionId: "a" }, "WRONG"],
    [single, { optionId: "ZZ" }, "WRONG"],
    [single, "b", "WRONG"],
  ])("SINGLE %#", (q, r, want) => expect(checkAnswer(q, r)).toBe(want));

  it("BR-Q02: ko'p tanlov faqat aynan to'plam bo'lsa to'g'ri, tartib muhim emas", () => {
    expect(checkAnswer(multi, { optionIds: ["c", "a"] })).toBe("CORRECT");
    expect(checkAnswer(multi, { optionIds: ["a"] })).toBe("WRONG");
    expect(checkAnswer(multi, { optionIds: ["a", "b", "c"] })).toBe("WRONG");
    expect(checkAnswer(multi, { optionIds: ["a", "a"] })).toBe("WRONG");
  });

  it.each(["0.75", "0,75", "3/4", "\\frac{3}{4}", "6/8"])("BR-M04: %s = 3/4", (value) =>
    expect(checkAnswer(num, { value })).toBe("CORRECT"),
  );

  it("BR-M04: noto'g'ri yoki o'qib bo'lmaydigan son WRONG, tolerance ishlaydi", () => {
    expect(checkAnswer(num, { value: "0.7" })).toBe("WRONG");
    expect(checkAnswer(num, { value: "abc" })).toBe("WRONG");
    const approx: QuestionInput = { ...num, answer: { value: "3.14", tolerance: "0.01" } };
    expect(checkAnswer(approx, { value: "3.141" })).toBe("CORRECT");
  });

  it("BR-M03: moslashtirish faqat barcha juftlar to'g'ri bo'lsa to'g'ri", () => {
    expect(checkAnswer(match, { pairs: { a: "c", b: "a" } })).toBe("CORRECT");
    expect(checkAnswer(match, { pairs: { a: "c", b: "b" } })).toBe("WRONG");
    expect(checkAnswer(match, { pairs: { a: "c" } })).toBe("WRONG");
    expect(checkAnswer(match, { pairs: { a: "c", b: "a", c: "b" } })).toBe("WRONG");
  });

  it("T-074, BR-Q03: EXPRESSION ekvivalentlik bo'yicha, o'qilmasa yoki qo'lda belgilansa ustozga", () => {
    const q = { type: "EXPRESSION" as const, text: "?", answer: { value: "x^2-1" } };
    expect(checkAnswer(q, { value: "(x-1)(x+1)" })).toBe("CORRECT");
    expect(checkAnswer(q, { value: "x^2+1" })).toBe("WRONG");
    expect(checkAnswer(q, { value: "x^2 = 1" })).toBe("MANUAL");
    expect(checkAnswer(q, { nope: 1 })).toBe("WRONG");
    expect(
      checkAnswer({ ...q, answer: { value: "(x-1)(x+1)", manual: true } }, { value: "(x-1)(x+1)" }),
    ).toBe("MANUAL");
  });

  it("WRITTEN ustozga qoladi (MANUAL)", () => {
    expect(checkAnswer({ type: "WRITTEN", text: "?" }, { text: "..." })).toBe("MANUAL");
  });
});

describe("codec", () => {
  it("BR-Q01: o'quvchi ko'rinishida to'g'ri javob va yechim yo'q", () => {
    const stored = toStorage({ ...single, solution: "yechim" });
    const view = toView({
      id: "q1",
      type: stored.type,
      text: stored.text,
      content: JSON.parse(JSON.stringify(stored.content)),
    });
    expect(view).toEqual({ id: "q1", type: "SINGLE", text: "?", options: opts });
    expect(JSON.stringify(view)).not.toContain("optionId");
  });
});
