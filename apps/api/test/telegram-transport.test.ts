import { describe, expect, it } from "vitest";
import { botApiTransport } from "../src/notify/telegram-transport";

describe("botApiTransport", () => {
  it("sendMessage'ga HTML va tugma bilan yuboradi", async () => {
    let seen: { url: string; body: Record<string, unknown> } | undefined;
    const fetchFn = (async (url: string, init: RequestInit) => {
      seen = { url, body: JSON.parse(String(init.body)) };
      return new Response("{}");
    }) as unknown as typeof fetch;
    const ok = await botApiTransport("1:T", fetchFn).send(42n, "<b>x</b>", {
      text: "Ochish",
      url: "https://a/b",
    });
    expect(ok).toBe(true);
    expect(seen?.url).toBe("https://api.telegram.org/bot1:T/sendMessage");
    expect(seen?.body).toMatchObject({
      chat_id: "42",
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "Ochish", url: "https://a/b" }]] },
    });
  });

  it("T-093: webApp tugmasi Mini App'ni Telegram ichida ochadi (web_app)", async () => {
    let body: Record<string, unknown> | undefined;
    const fetchFn = (async (_: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response("{}");
    }) as unknown as typeof fetch;
    await botApiTransport("1:T", fetchFn).send(1n, "x", {
      text: "Ochish",
      url: "https://app/weekly",
      webApp: true,
    });
    expect(body?.reply_markup).toEqual({
      inline_keyboard: [[{ text: "Ochish", web_app: { url: "https://app/weekly" } }]],
    });
  });

  it("xato yoki tarmoq uzilishida false qaytaradi, xato tashlamaydi", async () => {
    const bad = (async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    expect(await botApiTransport("1:T", bad).send(1n, "x")).toBe(false);
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await botApiTransport("1:T", down).send(1n, "x")).toBe(false);
  });
});
