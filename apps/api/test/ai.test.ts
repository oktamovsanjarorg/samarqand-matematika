import Anthropic from "@anthropic-ai/sdk";
import type { SolutionVerdict } from "@samarqand/shared";
import { describe, expect, it } from "vitest";
import { createAiProvider } from "../src/ai/ai.module";
import { DisabledAiProvider, type SolutionCheckInput } from "../src/ai/ai-provider";
import { CLAUDE_MODEL, ClaudeProvider } from "../src/ai/claude.provider";
import { SOLUTION_SYSTEM, solutionUserText } from "../src/ai/solution-prompt";
import { loadEnv } from "../src/config/env";

const base = { BOT_TOKEN: "1:x", JWT_SECRET: "0123456789abcdef" };

const input: SolutionCheckInput = {
  question: "$x^2-5x+6=0$ ildizlari yig'indisi?",
  modelSolution: "Viet: $x_1+x_2=5$",
  correctAnswer: "5",
  studentAnswer: "5",
  photos: [{ type: "image/png", data: Buffer.from([137, 80, 78, 71]) }],
};

const verdict: SolutionVerdict = {
  verdict: "SOLVED_CORRECTLY",
  confidence: "HIGH",
  answerFollows: true,
  steps: [{ text: "x1+x2=5", ok: true, note: "" }],
  copySignals: [],
  teacherNote: "Viet teoremasi toʻgʻri qoʻllangan",
  studentFeedback: "Yaxshi!",
};

/** SDK'ning o'z so'rov yo'li, tarmoqsiz: fetch o'rniga javob qaytaramiz va yuborilgan tanani ushlaymiz */
function stubClient(stop: string, text = JSON.stringify(verdict)) {
  const sent: Record<string, unknown>[] = [];
  const fetch = (_url: unknown, init?: { body?: unknown }) => {
    sent.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    const body = {
      id: "msg_1",
      type: "message",
      role: "assistant",
      model: CLAUDE_MODEL,
      content: [{ type: "text", text }],
      stop_reason: stop,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    };
    return Promise.resolve(
      new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }),
    );
  };
  return { client: new Anthropic({ apiKey: "test", fetch, maxRetries: 0 }), sent };
}

describe("AI provayderi (ADR-0004)", () => {
  it("standart: o'chiq, null qaytaradi; claude kalitsiz ishga tushmaydi", async () => {
    const env = loadEnv(base);
    expect(env.AI_PROVIDER).toBe("off");
    const p = createAiProvider(env);
    expect(p).toBeInstanceOf(DisabledAiProvider);
    expect(await p.checkSolution(input)).toBeNull();
    expect(() => loadEnv({ ...base, AI_PROVIDER: "claude" })).toThrow(/ANTHROPIC_API_KEY/);
    expect(createAiProvider(loadEnv({ ...base, AI_PROVIDER: "claude", ANTHROPIC_API_KEY: "k" })).name).toBe(
      "claude",
    );
  });

  it("so'rov: rasm + matn, tuzilgan chiqish, effort high, zaxira model; hukm sxemadan o'tadi", async () => {
    const { client, sent } = stubClient("end_turn");
    expect(await new ClaudeProvider(client).checkSolution(input)).toEqual(verdict);
    const req = sent[0] as {
      model: string;
      fallbacks: string;
      output_config: { effort: string; format: { type: string } };
      messages: { content: { type: string }[] }[];
    };
    expect(req.model).toBe("claude-opus-5-5");
    expect(req.fallbacks).toBe("default");
    expect(req.output_config.effort).toBe("high");
    expect(req.output_config.format.type).toBe("json_schema");
    expect(req.messages[0]?.content.map((c) => c.type)).toEqual(["image", "text"]);
  });

  it("rad etish, kesilgan javob yoki sxemaga mos kelmasa — null (oqim AI'siz davom etadi)", async () => {
    expect(await new ClaudeProvider(stubClient("refusal").client).checkSolution(input)).toBeNull();
    expect(await new ClaudeProvider(stubClient("max_tokens").client).checkSolution(input)).toBeNull();
    expect(
      await new ClaudeProvider(stubClient("end_turn", '{"verdict":"BOSHQA"}').client).checkSolution(input),
    ).toBeNull();
  });

  it("BR-W05: o'quvchiga izohda ko'chirish haqida yozilmaydi; matnda etalon va javob bor", () => {
    expect(SOLUTION_SYSTEM).toContain("Ko'chirish, shubha yoki AI haqida hech narsa yozma");
    const t = solutionUserText({ ...input, studentAnswer: null });
    expect(t).toContain("Viet");
    expect(t).toContain("O'quvchi belgilagan javob: —");
  });

  it("yordamchi: rejim qoidasi keshlanadi, kontekst alohida, rasm birinchi xabarda; rad etilsa null", async () => {
    const { client, sent } = stubClient("end_turn", "Qaysi formula kerak?");
    const p = new ClaudeProvider(client);
    const reply = await p.tutor({
      mode: "REVIEW",
      context: "Savol: 2+2",
      history: [
        { role: "user", text: "Qayerda xato qildim?" },
        { role: "assistant", text: "Rasmga qara" },
        { role: "user", text: "Tushunmadim" },
      ],
      photos: input.photos,
    });
    expect(reply).toBe("Qaysi formula kerak?");
    const body = sent[0] as {
      system: { text: string; cache_control?: object }[];
      messages: { role: string; content: unknown }[];
      output_config: object;
      fallbacks: unknown;
    };
    expect(body.system[0]?.cache_control).toEqual({ type: "ephemeral" });
    expect(body.system[0]?.text).toContain("xatoni tushuntirish");
    expect(body.system[1]).toEqual({ type: "text", text: "Kontekst:\nSavol: 2+2" });
    expect(body.output_config).toEqual({ effort: "medium" });
    expect(body.fallbacks).toBe("default");
    expect(JSON.stringify(body.messages[0]?.content)).toContain('"type":"image"');
    expect(body.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(body.messages[2]?.content).toBe("Tushunmadim");

    const refused = new ClaudeProvider(stubClient("refusal", "").client);
    expect(
      await refused.tutor({ mode: "FREE", context: "", history: [{ role: "user", text: "?" }], photos: [] }),
    ).toBeNull();
    expect(await new DisabledAiProvider().tutor()).toBeNull();
  });
});
