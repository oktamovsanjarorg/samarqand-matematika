import type Anthropic from "@anthropic-ai/sdk";
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import {
  ERROR_CODES,
  type AgentChatBody,
  type AgentConfirmBody,
  type AgentPending,
  type AgentReply,
  type AgentTranscript,
} from "@samarqand/shared";
import type { FastifyInstance } from "fastify";
import { AGENT_MODEL, type AgentModel } from "../ai/agent-model";
import type { JwtUser } from "../auth/decorators";
import { ENV, type Env } from "../config/env";
import { agentSystem } from "./agent-prompt";
import type { AgentRequest, AgentTool } from "./agent-tool";
import { ConfirmSigner, compact, danglingToolUse, itemsOf, toolTitle } from "./agent-transcript";
import { READ_TOOLS } from "./read-tools";
import { WRITE_TOOLS } from "./write-tools";

const parseJson = (body: string): unknown => {
  try {
    return body ? (JSON.parse(body) as unknown) : null;
  } catch {
    return body;
  }
};

/** Bitta so'rovda ko'pi bilan nechta model qadami (o'qish asboblari ketma-ket) */
const MAX_STEPS = 8;

type ToolResult = Anthropic.Beta.BetaToolResultBlockParam;
type Step = { result: ToolResult } | { pending: AgentPending };

/**
 * Admin agenti (T-156): Claude asbob tanlaydi, asbob mavjud admin endpoint'ini foydalanuvchining
 * o'z tokeni bilan ichkaridan chaqiradi (RBAC, tekshiruv va audit panel bilan bir xil).
 * O'zgartiruvchi asbob tasdiqsiz bajarilmaydi: imzolangan token qaytadi, ustoz "Tasdiqlash"ni bosadi.
 */
@Injectable()
export class AgentService {
  private readonly tools = new Map<string, AgentTool>(
    [...READ_TOOLS, ...WRITE_TOOLS].map((t) => [t.def.name, t]),
  );
  private readonly api = [...this.tools.values()].map((t) => t.api);
  private readonly signer: ConfirmSigner;
  private readonly usage = new Map<string, number>();
  /** Ishlatilgan tasdiqlar (tool_use id → muddati): eski suhbat bilan qayta yuborilsa amal takrorlanmaydi */
  private readonly used = new Map<string, number>();

  constructor(
    @Inject(AGENT_MODEL) private readonly model: AgentModel | null,
    @Inject(ENV) private readonly env: Env,
    private readonly host: HttpAdapterHost,
  ) {
    this.signer = new ConfirmSigner(env.JWT_SECRET);
  }

  enabled(): boolean {
    return this.model !== null;
  }

  async chat(user: JwtUser, auth: string, body: AgentChatBody): Promise<AgentReply> {
    if (danglingToolUse(body.transcript))
      throw new ConflictException("Avval kutilayotgan amalni tasdiqlang yoki rad eting");
    return this.run(user, auth, [...body.transcript, { role: "user", content: body.message }]);
  }

  async confirm(user: JwtUser, auth: string, body: AgentConfirmBody): Promise<AgentReply> {
    const use = danglingToolUse(body.transcript);
    const t = use && this.tools.get(use.name);
    if (!use || !t || !this.signer.verify(body.token, user.sub, use) || !this.consume(use.id))
      throw new ForbiddenException("Tasdiq eskirgan yoki notoʻgʻri. Soʻrovni qayta yozing.");
    const parsed = t.parse(use.input);
    let result: ToolResult;
    if (!parsed.ok) result = this.error(use.id, parsed.error);
    else if (!body.approve) result = this.error(use.id, "Foydalanuvchi bu amalni rad etdi. Bajarilmadi.");
    else result = await this.callTool(auth, use.id, t.def.request(parsed.value));
    return this.run(user, auth, [
      ...body.transcript,
      { role: "user", content: [result as unknown as Record<string, unknown>] },
    ]);
  }

  private async run(user: JwtUser, auth: string, transcript: AgentTranscript): Promise<AgentReply> {
    const model = this.model;
    if (!model)
      throw new ServiceUnavailableException({ message: "AI oʻchiq", code: ERROR_CODES.AI_UNAVAILABLE });
    const system = agentSystem({ role: user.role, now: new Date() });
    for (let step = 0; step < MAX_STEPS; step++) {
      this.count(user.sub);
      const res = await model.send({
        system,
        tools: this.api,
        messages: transcript as Anthropic.Beta.BetaMessageParam[],
      });
      transcript.push({ role: "assistant", content: res.content as unknown as Record<string, unknown>[] });
      const use = res.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (res.stop_reason !== "tool_use" || !use) break;
      const next = await this.step(user, auth, use);
      if ("pending" in next) return this.reply(transcript, next.pending);
      transcript.push({ role: "user", content: [next.result] as unknown as Record<string, unknown>[] });
    }
    return this.reply(transcript, null);
  }

  /** Bitta asbob: o'qish — darhol; yozish — sinov (bo'lsa) va tasdiq kutadi */
  private async step(user: JwtUser, auth: string, use: Anthropic.Beta.BetaToolUseBlock): Promise<Step> {
    const t = this.tools.get(use.name);
    if (!t) return { result: this.error(use.id, `Bunday asbob yoʻq: ${use.name}`) };
    const parsed = t.parse(use.input);
    if (!parsed.ok) return { result: this.error(use.id, `Notoʻgʻri argumentlar: ${parsed.error}`) };
    if (!t.def.write) return { result: await this.callTool(auth, use.id, t.def.request(parsed.value)) };
    let preview: unknown = null;
    if (t.def.preview) {
      const p = await this.exec(auth, t.def.preview(parsed.value));
      if (!p.ok) return { result: this.error(use.id, p.text) };
      const invalid = t.def.invalid?.(p.data);
      if (invalid) return { result: this.error(use.id, invalid) };
      preview = p.data;
    }
    return {
      pending: {
        token: this.signer.sign(user.sub, use),
        title: toolTitle(this.tools, use.name, use.input),
        lines: t.def.lines?.(parsed.value, preview) ?? [],
      },
    };
  }

  private async callTool(auth: string, id: string, req: AgentRequest): Promise<ToolResult> {
    const r = await this.exec(auth, req);
    return r.ok ? { type: "tool_result", tool_use_id: id, content: r.text } : this.error(id, r.text);
  }

  private error(id: string, text: string): ToolResult {
    return { type: "tool_result", tool_use_id: id, content: text, is_error: true };
  }

  /** Admin endpoint'ini ichkaridan chaqirish: foydalanuvchining o'z tokeni bilan (RBAC, tekshiruv, audit o'sha) */
  private async exec(auth: string, req: AgentRequest): Promise<{ ok: boolean; text: string; data: unknown }> {
    const fastify = this.host.httpAdapter.getInstance<FastifyInstance>();
    const res = await fastify.inject({
      method: req.method,
      url: `/api${req.path}`,
      headers: { authorization: auth, ...(req.body ? { "content-type": "application/json" } : {}) },
      ...(req.body ? { payload: JSON.stringify(req.body) } : {}),
    });
    const data = parseJson(res.body);
    if (res.statusCode < 400) return { ok: true, text: compact(data ?? "Bajarildi"), data };
    const message = (data as { message?: unknown } | null)?.message;
    return {
      ok: false,
      text: `Xato ${res.statusCode}: ${typeof message === "string" ? message : "bajarilmadi"}`,
      data,
    };
  }

  private reply(transcript: AgentTranscript, pending: AgentPending | null): AgentReply {
    return { transcript, items: itemsOf(transcript, this.tools), pending };
  }

  private consume(toolUseId: string, now = Date.now()): boolean {
    for (const [k, exp] of this.used) if (exp < now) this.used.delete(k);
    if (this.used.has(toolUseId)) return false;
    this.used.set(toolUseId, now + 31 * 60_000);
    return true;
  }

  /** Kunlik chegara (xarajat): xodim bo'yicha, Toshkent sanasi */
  private count(userId: string) {
    const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tashkent" });
    const key = `${userId}:${day}`;
    const used = (this.usage.get(key) ?? 0) + 1;
    if (used > this.env.AGENT_DAILY_LIMIT)
      throw new HttpException(
        { message: "Bugungi AI chegarasi tugadi. Ertaga davom eting.", code: ERROR_CODES.AI_LIMIT },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    if (this.usage.size > 1000) this.usage.clear();
    this.usage.set(key, used);
  }
}
