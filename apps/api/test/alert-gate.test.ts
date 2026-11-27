import { describe, expect, it } from "vitest";
import { AlertGate } from "../src/notify/alert-gate";

describe("AlertGate (T-190)", () => {
  it("bir xil xato oynada bir marta, oyna o'tgach yana", () => {
    const g = new AlertGate(1000, 10);
    expect(g.allow("a", 0)).toBe(true);
    expect(g.allow("a", 500)).toBe(false);
    expect(g.allow("b", 500)).toBe(true);
    expect(g.allow("a", 1000)).toBe(true);
  });

  it("oynada jami chegaradan oshmaydi", () => {
    const g = new AlertGate(1000, 2);
    expect([g.allow("a", 0), g.allow("b", 1), g.allow("c", 2)]).toEqual([true, true, false]);
    expect(g.allow("c", 1001)).toBe(true);
  });
});
