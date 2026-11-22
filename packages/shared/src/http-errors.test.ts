import { describe, expect, it } from "vitest";
import { FALLBACK_ERROR, UNAVAILABLE_MESSAGE, httpErrorMessage } from "./http-errors";

describe("httpErrorMessage (T-151)", () => {
  it("API xabari bo'lsa o'zgarmaydi", () => {
    expect(httpErrorMessage(503, "AI hozir ishlamayapti")).toBe("AI hozir ishlamayapti");
    expect(httpErrorMessage(404, "Topilmadi")).toBe("Topilmadi");
  });
  it("tanasiz 502/503/504: server yangilanmoqda", () => {
    for (const s of [502, 503, 504]) expect(httpErrorMessage(s)).toBe(UNAVAILABLE_MESSAGE);
  });
  it("boshqa tanasiz xato: umumiy xabar", () => {
    expect(httpErrorMessage(500)).toBe(FALLBACK_ERROR);
    expect(httpErrorMessage(400, "")).toBe(FALLBACK_ERROR);
  });
});
