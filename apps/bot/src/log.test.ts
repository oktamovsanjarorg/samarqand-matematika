import { GrammyError, HttpError } from "grammy";
import { describe, expect, it } from "vitest";
import { describeBotError } from "./log";

describe("bot xato logi (T-141)", () => {
  it("GrammyError: metod, kod va tavsif; chat_id va xabar matni yo'q", () => {
    const e = new GrammyError(
      "Call to sendMessage failed!",
      { ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" },
      "sendMessage",
      { chat_id: 123456789, text: "Salom, MaxfiyIsm!" },
    );
    const s = describeBotError(e);
    expect(s).toBe("GrammyError sendMessage 403: Forbidden: bot was blocked by the user");
    expect(s).not.toMatch(/MaxfiyIsm|123456789/);
  });

  it("ichki API xatosi holat kodi bilan, boshqa xato faqat nomi bilan", () => {
    expect(describeBotError(new Error("API 409"))).toBe("API 409");
    expect(describeBotError(new TypeError("telefon 998901234567 notoʻgʻri"))).toBe("TypeError");
    expect(describeBotError(new HttpError("Network request failed", new TypeError("fetch failed")))).toBe(
      "HttpError: TypeError",
    );
    expect(describeBotError("matn")).toBe("Nomaʼlum xato");
  });
});
