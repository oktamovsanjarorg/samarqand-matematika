import { describe, expect, it } from "vitest";
import { fallbackMessage, startMessage } from "./messages";

describe("startMessage", () => {
  it("ism va brend bilan salomlashadi, Mini App tugmasi bor", () => {
    const m = startMessage({ firstName: "Ali", brand: "SMM", miniappUrl: "https://x.uz" });
    expect(m.text).toContain("Ali");
    expect(m.text).toContain("SMM");
    expect(JSON.stringify(m.keyboard.inline_keyboard)).toContain("https://x.uz");
  });
});

describe("fallbackMessage (T-129)", () => {
  it("bot xabarni o'qimasligini aytadi va ilovaga yo'naltiradi", () => {
    const m = fallbackMessage("https://x.uz");
    expect(m.text).toContain("xabarlarni oʻqimaydi");
    expect(m.text).toContain("AI yordamchi");
    expect(JSON.stringify(m.keyboard.inline_keyboard)).toContain("https://x.uz");
  });
});
