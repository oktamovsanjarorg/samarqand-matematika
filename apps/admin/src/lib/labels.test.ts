import { describe, expect, it } from "vitest";
import { formatDate } from "./labels";

describe("formatDate", () => {
  it("Toshkent vaqti (UTC+5) bilan, kun.oy.yil, soat:daqiqa", () => {
    expect(formatDate("2026-11-20T10:09:00Z")).toBe("20.11.2026, 15:09");
    expect(formatDate("2026-12-31T19:30:00Z")).toBe("01.01.2027, 00:30");
  });
});
