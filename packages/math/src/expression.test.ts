import { describe, expect, it } from "vitest";
import { expressionsEqual, parseExpression } from "./expression";

describe("T-074: ifoda ekvivalentligi", () => {
  it.each([
    ["2(x+1)", "2x+2"],
    ["(x-1)(x+1)", "x^2-1"],
    ["x²−1", "x^2-1"],
    ["\\frac{x}{2}", "0,5x"],
    ["\\frac{1}{2}x", "x/2"],
    ["\\sqrt{x^2+2x+1}", "sqrt((x+1)^2)"],
    ["2\\cdot a \\cdot b", "2ab"],
    ["(a+b)^2", "a^2+2ab+b^2"],
    ["\\sin x", "sin(x)"],
    ["2^{-1}", "0.5"],
    ["-x^2", "-(x^2)"],
    ["\\pi r^2", "πr²"],
    ["X+1", "x+1"],
    ["$x \\cdot x$", "x^2"],
    ["2sin(x)cos(x)", "sin(2x)"],
    ["\\left(x+1\\right)^2", "x^2+2x+1"],
  ])("%s = %s", (a, b) => {
    expect(expressionsEqual(a, b)).toBe(true);
  });

  it.each([
    ["2x+1", "2x+2"],
    ["x^2", "2x"],
    ["sqrt(x^2)", "x"],
    ["y+1", "x+1"],
    ["1/2x", "1/(2x)"],
    ["-x^2", "(-x)^2"],
  ])("%s ≠ %s", (a, b) => {
    expect(expressionsEqual(a, b)).toBe(false);
  });

  it.each(["", "x=2", "\\int x dx", "2*(x", "x +* 2", "a,b", "x!", "2".repeat(201)])(
    "o'qilmaydigan yozuv: %s → null (ustoz tekshiradi)",
    (a) => {
      expect(parseExpression(a)).toBeNull();
      expect(expressionsEqual(a, "x")).toBeNull();
    },
  );

  it("hech qayerda aniqlanmagan ifoda solishtirilmaydi", () => {
    expect(expressionsEqual("sqrt(-1-x^2)", "sqrt(-2-x^2)")).toBeNull();
  });
});
