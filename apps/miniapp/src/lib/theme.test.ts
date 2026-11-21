import { describe, expect, it } from "vitest";
import { contrast, hexToRgb, themeOverrides } from "./theme";

describe("T-071: Telegram ranglari kontrast bo'yicha", () => {
  it("kontrast nisbati WCAG formulasi bo'yicha", () => {
    expect(contrast("255 255 255", "0 0 0")).toBeCloseTo(21, 1);
    expect(contrast(hexToRgb("#708499") ?? "", hexToRgb("#17212b") ?? "")).toBeCloseTo(4.22, 1);
  });

  it("Telegram'ning past kontrastli hint va destructive ranglari olinmaydi, fon ranglari olinadi", () => {
    const set = themeOverrides({
      bg_color: "#17212b",
      secondary_bg_color: "#232e3c",
      text_color: "#f5f5f5",
      hint_color: "#708499",
      link_color: "#6ab3f3",
      destructive_text_color: "#ec3942",
    });
    expect(set).toEqual({
      bg_color: "23 33 43",
      secondary_bg_color: "35 46 60",
      text_color: "245 245 245",
      link_color: "106 179 243",
    });
  });

  it("kunduzgi Telegram ranglari yetarli kontrast bersa o'zgarmaydi", () => {
    expect(themeOverrides({ bg_color: "#ffffff", hint_color: "#5f6570" })).toEqual({
      bg_color: "255 255 255",
      hint_color: "95 101 112",
    });
  });
});
