import { describe, expect, it } from "vitest";
import { numbersEqual, parseNumber } from "./numeric";

describe("BR-M04: son javoblar ekvivalentligi", () => {
  const equal: [string, string][] = [
    ["3/4", "0.75"],
    ["0,75", "3/4"],
    ["\\frac{3}{4}", "0.75"],
    ["\\dfrac{3}{4}", "6/8"],
    ["$\\frac{1}{2}$", "0.5"],
    ["-0.5", "-1/2"],
    ["−0,5", "-\\frac{1}{2}"],
    ["1 1/2", "1.5"],
    ["-1 1/2", "-3/2"],
    ["2", "2.000"],
    ["+2", "2"],
    [".5", "1/2"],
    ["(-3)/6", "-0.5"],
    ["(1)/(2)", "0.5"],
    ["0.1", "1/10"],
    [" 7 ", "7"],
    ["\\left(\\frac{2}{3}\\right)", "4/6"],
  ];
  it.each(equal)("%s = %s", (a, b) => {
    expect(numbersEqual(a, b)).toBe(true);
  });

  const notEqual: [string, string][] = [
    ["3/4", "0.7"],
    ["0.33", "1/3"],
    ["-2", "2"],
    ["1/0", "1/0"],
    ["", "0"],
    ["abc", "1"],
    ["2x", "2"],
    ["1/2/3", "1/6"],
  ];
  it.each(notEqual)("%s ≠ %s", (a, b) => {
    expect(numbersEqual(a, b)).toBe(false);
  });

  it("tolerance bilan: 0.33 ≈ 1/3 (±0.01)", () => {
    expect(numbersEqual("0.33", "1/3", "0.01")).toBe(true);
    expect(numbersEqual("0.3", "1/3", "0.01")).toBe(false);
  });

  it("0.1 + 0.2 kabi float xatolari yo'q: aniq kasr", () => {
    expect(parseNumber("0.30000000000000004")).not.toEqual(parseNumber("0.3"));
    expect(parseNumber("0.3")).toEqual({ num: 3n, den: 10n });
  });

  it("juda uzun kiritish rad etiladi", () => {
    expect(parseNumber("1".repeat(100))).toBeNull();
  });
});
