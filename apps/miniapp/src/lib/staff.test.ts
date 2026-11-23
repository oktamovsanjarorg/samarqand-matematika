import { describe, expect, it } from "vitest";
import { absoluteUrl, adminInBrowser, adminLoginUrl } from "./staff";

describe("T-175: xodim admin panelga qayerda o'tadi", () => {
  it("kompyuterdagi Telegram'da brauzer orqali", () => {
    for (const p of ["tdesktop", "macos", "weba", "webk", "unigram"]) expect(adminInBrowser(p)).toBe(true);
  });

  it("telefonda va platforma noma'lum bo'lsa Mini App ichida", () => {
    for (const p of ["android", "ios", "unknown", undefined]) expect(adminInBrowser(p)).toBe(false);
  });

  it("brauzer uchun to'liq manzil, initData hash'da", () => {
    const url = absoluteUrl(adminLoginUrl("a=1&hash=x", "/admin"), "https://app.example.uz");
    expect(url).toBe("https://app.example.uz/admin/login#tg=a%3D1%26hash%3Dx");
  });
});
