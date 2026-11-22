import type { AiHealth } from "./ai-health";
import { request } from "node:https";

/** DeepSeek chat/completions (OpenAI bilan mos) xabarlari */
export type DsMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: DsToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface DsToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface DsTool {
  type: "function";
  function: { name: string; description: string; parameters: object };
}

export interface DsRequest {
  messages: DsMessage[];
  tools?: DsTool[];
  maxTokens?: number;
}

export interface DsChoice {
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | string;
  message: { content: string | null; tool_calls?: DsToolCall[] };
}

/** Testda soxtasi qo'yiladi: tarmoqsiz */
export type DsTransport = (body: object) => Promise<{ status: number; json: unknown }>;

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const RETRY = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** api.deepseek.com ga POST. IPv4 majburiy (ona tili serverida IPv6 ishlamagan), 120 soniya chegarasi */
export function httpsTransport(apiKey: string, timeoutMs = 120_000): DsTransport {
  return (body) => {
    const data = JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = request(
        {
          host: "api.deepseek.com",
          path: "/chat/completions",
          method: "POST",
          family: 4,
          timeout: timeoutMs,
          headers: {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(data),
            authorization: `Bearer ${apiKey}`,
          },
        },
        (res) => {
          let raw = "";
          res.on("data", (c: Buffer) => (raw += c.toString()));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, json: parseJson(raw) }));
        },
      );
      req.on("timeout", () => req.destroy(new Error("DeepSeek timeout")));
      req.on("error", reject);
      req.end(data);
    });
  };
}

export class DeepSeekError extends Error {
  /** HTTP status; 0: tarmoq xatosi */
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

/**
 * DeepSeek (T-159). Fikrlash rejimi o'chiq: asbob chaqiruvlarida reasoning_content'ni qaytarish shart bo'lmasin.
 * Band (429/5xx) yoki tarmoq xatosida bir marta qayta uriniladi.
 */
export class DeepSeekClient {
  constructor(
    private readonly transport: DsTransport,
    readonly model: string,
    private readonly health?: AiHealth,
  ) {}

  async chat(req: DsRequest): Promise<DsChoice> {
    try {
      const choice = await this.send(req);
      this.health?.ok();
      return choice;
    } catch (e) {
      this.health?.fail(e instanceof DeepSeekError ? e.status : 0);
      throw e;
    }
  }

  private async send(req: DsRequest): Promise<DsChoice> {
    const body = this.body(req);
    let last = new DeepSeekError("DeepSeek javob bermadi");
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await sleep(2000);
      let r: { status: number; json: unknown };
      try {
        r = await this.transport(body);
      } catch (e) {
        last = new DeepSeekError(e instanceof Error ? e.message : "tarmoq xatosi");
        continue;
      }
      const j = r.json as { choices?: DsChoice[] } | null;
      const choice = j?.choices?.[0];
      if (r.status === 200 && choice) return choice;
      // Xato matni logga tushmaydi (unda so'rov parchasi bo'lishi mumkin): faqat status
      last = new DeepSeekError(`DeepSeek ${r.status}`, r.status);
      if (!RETRY.has(r.status)) break;
    }
    throw last;
  }

  private body(req: DsRequest) {
    return {
      model: this.model,
      max_tokens: req.maxTokens ?? 4000,
      temperature: 0.3,
      thinking: { type: "disabled" },
      messages: req.messages,
      ...(req.tools?.length ? { tools: req.tools, tool_choice: "auto" } : {}),
    };
  }
}
