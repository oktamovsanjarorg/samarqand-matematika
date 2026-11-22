import { describe, expect, it } from "vitest";
import { createAgentModel, createAiProvider } from "../src/ai/ai.module";
import { DeepSeekAgentModel, toDeepSeek } from "../src/ai/deepseek-agent";
import { DeepSeekClient, DeepSeekError, type DsTransport } from "../src/ai/deepseek-client";
import { DeepSeekProvider } from "../src/ai/deepseek.provider";
import { loadEnv } from "../src/config/env";

/** Soxta DeepSeek: javoblar navbatda, so'rovlar yoziladi */
function fake(...replies: { status: number; json: unknown }[]) {
  const bodies: Record<string, unknown>[] = [];
  const transport: DsTransport = (body) => {
    bodies.push(structuredClone(body) as Record<string, unknown>);
    const r = replies.shift();
    return r ? Promise.resolve(r) : Promise.reject(new Error("ECONNRESET"));
  };
  return { bodies, client: new DeepSeekClient(transport, "deepseek-test") };
}
const ok = (message: object, finish_reason = "stop") => ({
  status: 200,
  json: { choices: [{ finish_reason, message }] },
});

const params = {
  system: [
    { type: "text" as const, text: "Qoidalar" },
    { type: "text" as const, text: "Hozir: bugun" },
  ],
  tools: [
    {
      name: "find_students",
      description: "Qidirish",
      input_schema: { type: "object" as const, properties: { query: { type: "string" } } },
    },
  ],
  messages: [] as Parameters<DeepSeekAgentModel["send"]>[0]["messages"],
};

describe("DeepSeek (T-159)", () => {
  it("agent suhbati DeepSeek formatiga: tizim, asbob chaqiruvi va natijasi (xato belgisi bilan)", () => {
    const msgs = toDeepSeek({
      ...params,
      messages: [
        { role: "user", content: "Alini top" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "Qidiraman." },
            { type: "tool_use", id: "call_1", name: "find_students", input: { query: "Ali" } },
          ],
        },
        {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: "call_1", content: "Xato 403: ruxsat yoʻq", is_error: true },
          ],
        },
      ],
    });
    expect(msgs).toEqual([
      { role: "system", content: "Qoidalar\n\nHozir: bugun" },
      { role: "user", content: "Alini top" },
      {
        role: "assistant",
        content: "Qidiraman.",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "find_students", arguments: '{"query":"Ali"}' },
          },
        ],
      },
      { role: "tool", tool_call_id: "call_1", content: "XATO: Xato 403: ruxsat yoʻq" },
    ]);
  });

  it("javobdagi birinchi asbob chaqiruvi tool_use bo'ladi, ortiqchasi tashlanadi; asboblar function sifatida yuboriladi", async () => {
    const f = fake(
      ok(
        {
          content: "",
          tool_calls: [
            {
              id: "c1",
              type: "function",
              function: { name: "find_students", arguments: '{"query":"Vali"}' },
            },
            { id: "c2", type: "function", function: { name: "dashboard", arguments: "{}" } },
          ],
        },
        "tool_calls",
      ),
    );
    const r = await new DeepSeekAgentModel(f.client).send({
      ...params,
      messages: [{ role: "user", content: "x" }],
    });
    expect(r.stop_reason).toBe("tool_use");
    expect(r.content).toEqual([
      {
        type: "tool_use",
        id: "c1",
        name: "find_students",
        input: { query: "Vali" },
        caller: { type: "direct" },
      },
    ]);
    expect(f.bodies[0]).toMatchObject({
      model: "deepseek-test",
      tool_choice: "auto",
      thinking: { type: "disabled" },
      tools: [{ type: "function", function: { name: "find_students", description: "Qidirish" } }],
    });
  });

  it("buzilgan argument yiqitmaydi (asbob tekshiruvi xato qaytaradi); length → max_tokens", async () => {
    const f = fake(
      ok(
        {
          content: null,
          tool_calls: [{ id: "c1", type: "function", function: { name: "x", arguments: "{bad" } }],
        },
        "tool_calls",
      ),
      ok({ content: "uzun…" }, "length"),
    );
    const m = new DeepSeekAgentModel(f.client);
    const a = await m.send({ ...params, messages: [{ role: "user", content: "x" }] });
    expect((a.content[0] as { input: unknown }).input).toEqual({ _invalid: "{bad" });
    const b = await m.send({ ...params, messages: [{ role: "user", content: "x" }] });
    expect(b.stop_reason).toBe("max_tokens");
  });

  it("429 va tarmoq xatosida bir marta qayta uriniladi, 401 da urinilmaydi; xato matnida faqat status", async () => {
    const busy = fake({ status: 429, json: null }, ok({ content: "Salom" }));
    expect((await busy.client.chat({ messages: [] })).message.content).toBe("Salom");
    expect(busy.bodies).toHaveLength(2);

    const bad = fake(
      { status: 401, json: { error: { message: "maxfiy: sk-123" } } },
      ok({ content: "yo'q" }),
    );
    await expect(bad.client.chat({ messages: [] })).rejects.toThrow(new DeepSeekError("DeepSeek 401"));
    expect(bad.bodies).toHaveLength(1);

    const down = fake();
    await expect(down.client.chat({ messages: [] })).rejects.toBeInstanceOf(DeepSeekError);
  }, 10_000);

  it("yordamchi: rasm bo'lsa model buni biladi; xato bo'lsa null; yechim rasmiga hukm bermaydi", async () => {
    const f = fake(ok({ content: " Qaysi formulani bilasan? " }));
    const p = new DeepSeekProvider(f.client);
    const input = {
      mode: "REVIEW" as const,
      context: "Savol: 2+2",
      history: [{ role: "user" as const, text: "Tushuntiring" }],
      photos: [{ type: "image/png" as const, data: Buffer.from("x") }],
    };
    expect(await p.tutor(input)).toBe("Qaysi formulani bilasan?");
    const sent = f.bodies[0]?.messages as { role: string; content: string }[];
    expect(sent[0]?.content).toContain("rasmni ko'ra olmaysan");
    expect(sent[1]).toEqual({ role: "user", content: "Tushuntiring" });
    expect(await p.tutor(input)).toBeNull();
    expect(await p.checkSolution()).toBeNull();
  }, 10_000);

  it("AI_PROVIDER=deepseek: kalitsiz ishga tushmaydi; kalit bilan provayder va agent DeepSeek", () => {
    const base = {
      BOT_TOKEN: "1:x",
      JWT_SECRET: "x".repeat(16),
      DATABASE_URL: "postgresql://x",
      AI_PROVIDER: "deepseek",
    };
    expect(() => loadEnv(base)).toThrow(/DEEPSEEK_API_KEY/);
    expect(() => loadEnv({ ...base, DEEPSEEK_API_KEY: "" })).toThrow(/DEEPSEEK_API_KEY/);
    // .env.example dagi bo'sh kalit AI o'chiq bo'lsa ishga tushishga xalaqit bermaydi
    expect(
      loadEnv({ ...base, AI_PROVIDER: "off", DEEPSEEK_API_KEY: "", ANTHROPIC_API_KEY: "" }).DEEPSEEK_API_KEY,
    ).toBeUndefined();
    const env = loadEnv({ ...base, DEEPSEEK_API_KEY: "test" });
    expect(createAiProvider(env).name).toBe("deepseek");
    expect(createAgentModel(env)).toBeInstanceOf(DeepSeekAgentModel);
    expect(env.DEEPSEEK_MODEL).toBe("deepseek-v4-pro");
  });
});
