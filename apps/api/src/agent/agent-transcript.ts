import type Anthropic from "@anthropic-ai/sdk";
import type { AgentItem, AgentTranscript } from "@samarqand/shared";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { AgentTool } from "./agent-tool";

type Block = Record<string, unknown>;
const blocks = (c: AgentTranscript[number]["content"]): Block[] => (typeof c === "string" ? [] : c);

/** Asbob natijasi agentga: shaxsiy telefon raqamlari yuborilmaydi, juda uzun javob qisqartiriladi */
export function compact(data: unknown, max = 12_000): string {
  const text = JSON.stringify(data, (k, v: unknown) => (/phone/i.test(k) ? undefined : v)) ?? "null";
  return text.length > max ? `${text.slice(0, max)}… (qisqartirildi)` : text;
}

export function toolTitle(tools: Map<string, AgentTool>, name: string, input: unknown): string {
  const t = tools.get(name);
  const parsed = t?.parse(input);
  return t && parsed?.ok ? t.def.title(parsed.value) : name;
}

/** Suhbat → foydalanuvchi ko'radigan ro'yxat: xabarlar va bajarilgan amallar */
export function itemsOf(transcript: AgentTranscript, tools: Map<string, AgentTool>): AgentItem[] {
  const titles = new Map<string, string>();
  const items: AgentItem[] = [];
  for (const m of transcript) {
    if (typeof m.content === "string") {
      items.push({ kind: m.role, text: m.content });
      continue;
    }
    for (const b of blocks(m.content)) {
      if (b.type === "text" && m.role === "assistant" && String(b.text).trim())
        items.push({ kind: "assistant", text: String(b.text) });
      if (b.type === "tool_use") titles.set(String(b.id), toolTitle(tools, String(b.name), b.input));
      if (b.type === "tool_result")
        items.push({
          kind: "action",
          title: titles.get(String(b.tool_use_id)) ?? "Amal",
          ok: b.is_error !== true,
        });
    }
  }
  return items;
}

/** Oxirgi assistant xabaridagi javobsiz tool_use (tasdiq kutilmoqda) */
export function danglingToolUse(transcript: AgentTranscript): Anthropic.Beta.BetaToolUseBlock | null {
  const last = transcript.at(-1);
  if (last?.role !== "assistant") return null;
  const use = blocks(last.content).find((b) => b.type === "tool_use");
  return (use as unknown as Anthropic.Beta.BetaToolUseBlock | undefined) ?? null;
}

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("base64url");

interface Claim {
  u: string;
  i: string;
  h: string;
  e: number;
}

/** Tasdiq tokeni: aynan shu foydalanuvchi, shu tool_use va shu argumentlar; 30 daqiqa */
export class ConfirmSigner {
  constructor(private readonly secret: string) {}

  private mac(payload: string) {
    return createHmac("sha256", `${this.secret}:agent-confirm`).update(payload).digest("base64url");
  }

  sign(userId: string, use: { id: string; input: unknown }, now = Date.now()): string {
    const claim: Claim = { u: userId, i: use.id, h: hash(use.input), e: now + 30 * 60_000 };
    const payload = Buffer.from(JSON.stringify(claim)).toString("base64url");
    return `${payload}.${this.mac(payload)}`;
  }

  verify(token: string, userId: string, use: { id: string; input: unknown }, now = Date.now()): boolean {
    const [payload = "", mac = ""] = token.split(".");
    const want = Buffer.from(this.mac(payload));
    const got = Buffer.from(mac);
    if (want.length !== got.length || !timingSafeEqual(want, got)) return false;
    const c = JSON.parse(Buffer.from(payload, "base64url").toString()) as Claim;
    return c.u === userId && c.i === use.id && c.h === hash(use.input) && c.e > now;
  }
}
