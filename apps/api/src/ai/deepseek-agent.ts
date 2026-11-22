import type Anthropic from "@anthropic-ai/sdk";
import type { AgentModel } from "./agent-model";
import type { DeepSeekClient, DsMessage, DsTool } from "./deepseek-client";

type Params = Parameters<AgentModel["send"]>[0];
type Block = Record<string, unknown>;
const list = (c: Anthropic.Beta.BetaMessageParam["content"]): Block[] =>
  typeof c === "string" ? [{ type: "text", text: c }] : (c as unknown as Block[]);
const text = (blocks: Block[]) =>
  blocks
    .filter((b) => b.type === "text")
    .map((b) => String(b.text))
    .join("\n");

/** Asbob natijasi matni (xato bo'lsa belgi bilan) */
function resultText(b: Block): string {
  const c = b.content;
  const body = typeof c === "string" ? c : Array.isArray(c) ? text(c as Block[]) : "";
  return b.is_error === true ? `XATO: ${body}` : body;
}

/** Agent suhbati (Anthropic formati) → DeepSeek xabarlari */
export function toDeepSeek(p: Params): DsMessage[] {
  const out: DsMessage[] = [{ role: "system", content: p.system.map((s) => s.text).join("\n\n") }];
  for (const m of p.messages) {
    const blocks = list(m.content);
    if (m.role === "assistant") {
      const calls = blocks
        .filter((b) => b.type === "tool_use")
        .map((b) => ({
          id: String(b.id),
          type: "function" as const,
          function: { name: String(b.name), arguments: JSON.stringify(b.input ?? {}) },
        }));
      out.push({
        role: "assistant",
        content: text(blocks) || null,
        ...(calls.length ? { tool_calls: calls } : {}),
      });
      continue;
    }
    for (const b of blocks.filter((x) => x.type === "tool_result"))
      out.push({ role: "tool", tool_call_id: String(b.tool_use_id), content: resultText(b) });
    const t = text(blocks);
    if (t) out.push({ role: "user", content: t });
  }
  return out;
}

const tools = (p: Params): DsTool[] =>
  p.tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description ?? "", parameters: t.input_schema },
  }));

function parseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    // Buzilgan argument: asbob tekshiruvi xato qaytaradi, agent tuzatadi
    return { _invalid: raw.slice(0, 200) };
  }
}

/**
 * DeepSeek admin agenti uchun (T-159): bir qadamda bitta asbob (ortiqchasi tashlanadi,
 * aks holda keyingi so'rovda javobsiz tool_call xato beradi).
 */
export class DeepSeekAgentModel implements AgentModel {
  constructor(private readonly client: DeepSeekClient) {}

  async send(p: Params): Promise<Pick<Anthropic.Beta.BetaMessage, "content" | "stop_reason">> {
    const r = await this.client.chat({ messages: toDeepSeek(p), tools: tools(p), maxTokens: 8000 });
    const content: Block[] = [];
    if (r.message.content?.trim())
      content.push({ type: "text", text: r.message.content.trim(), citations: null });
    const call = r.message.tool_calls?.[0];
    if (call)
      content.push({
        type: "tool_use",
        id: call.id,
        name: call.function.name,
        input: parseArgs(call.function.arguments),
        caller: { type: "direct" },
      });
    const stop = call ? "tool_use" : r.finish_reason === "length" ? "max_tokens" : "end_turn";
    return { content: content as unknown as Anthropic.Beta.BetaContentBlock[], stop_reason: stop };
  }
}
