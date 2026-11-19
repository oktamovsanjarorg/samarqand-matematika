import { describe, expect, it } from "vitest";
import { startMessage } from "./messages";

describe("startMessage", () => {
  it("ism va brend bilan salomlashadi, Mini App tugmasi bor", () => {
    const m = startMessage({ firstName: "Ali", brand: "SMM", miniappUrl: "https://x.uz" });
    expect(m.text).toContain("Ali");
    expect(m.text).toContain("SMM");
    expect(JSON.stringify(m.keyboard.inline_keyboard)).toContain("https://x.uz");
  });
});
