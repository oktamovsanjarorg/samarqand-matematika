import { describe, expect, it } from "vitest";
import { fromLocalInput, toLocalInput } from "./weekly";

describe("haftalik oyna vaqti (Toshkent)", () => {
  it("ISO ↔ datetime-local", () => {
    expect(toLocalInput("2026-11-22T19:00:00.000Z")).toBe("2026-11-23T00:00");
    expect(fromLocalInput("2026-11-29T23:59")).toBe("2026-11-29T18:59:00.000Z");
  });
});
