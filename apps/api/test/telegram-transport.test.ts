import { describe, expect, it } from "vitest";
import { botApiTransport, rateLimited } from "../src/notify/telegram-transport";

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

  it("T-115: 429 bo'lsa Telegram aytgan vaqtni kutib qayta yuboradi (ko'pi bilan 2 marta)", async () => {
    let calls = 0;
    const fetchFn = (async () => {
      calls += 1;
      return calls === 1
        ? new Response(JSON.stringify({ ok: false, parameters: { retry_after: 2 } }), { status: 429 })
        : new Response("{}");
    }) as unknown as typeof fetch;
    const waits: number[] = [];
    const wait = async (ms: number) => {
      waits.push(ms);
    };
    expect(await botApiTransport("1:T", fetchFn, wait).send(1n, "x")).toBe(true);
    expect(waits).toEqual([2000]);

    const always = (async () => new Response("{}", { status: 429 })) as unknown as typeof fetch;
    waits.length = 0;
    expect(await botApiTransport("1:T", always, wait).send(1n, "x")).toBe(false);
    expect(waits).toEqual([1000, 1000]);
  });
});

describe("bot nomi (T-143)", () => {
  it("getMe bir marta so'raladi; xato yoki noto'g'ri javobda null va keyin qayta so'raladi", async () => {
    const urls: string[] = [];
    let reply = new Response("", { status: 502 });
    const fetchFn = (async (url: string) => {
      urls.push(url);
      return reply;
    }) as unknown as typeof fetch;
    const t = botApiTransport("1:T", fetchFn);
    expect(await t.botUsername()).toBeNull();
    reply = new Response(JSON.stringify({ ok: true, result: { username: "bad name<" } }));
    expect(await t.botUsername()).toBeNull();
    reply = new Response(JSON.stringify({ ok: true, result: { username: "samarqand_bot" } }));
    expect(await t.botUsername()).toBe("samarqand_bot");
    expect(await rateLimited(t, 10).botUsername()).toBe("samarqand_bot");
    expect(urls).toEqual(Array(3).fill("https://api.telegram.org/bot1:T/getMe"));
  });
});

describe("rateLimited (T-115)", () => {
  it("ommaviy yuborishda xabarlar orasida oraliq saqlanadi", async () => {
    const sent: bigint[] = [];
    const inner = { send: async (id: bigint) => (sent.push(id), true), botUsername: async () => null };
    const waits: number[] = [];
    const t = rateLimited(inner, 10, { now: () => 0, wait: async (ms) => void waits.push(ms) });
    await Promise.all([1n, 2n, 3n].map((id) => t.send(id, "x")));
    expect(sent).toEqual([1n, 2n, 3n]);
    expect(waits).toEqual([100, 200]);
  });
});
