import Anthropic from "@anthropic-ai/sdk";

/** Agent uchun bitta model chaqiruvi (testda soxtasi qo'yiladi). null: AI o'chiq */
export interface AgentModel {
  send(params: {
    system: Anthropic.Beta.BetaTextBlockParam[];
    tools: Anthropic.Beta.BetaTool[];
    messages: Anthropic.Beta.BetaMessageParam[];
  }): Promise<Pick<Anthropic.Beta.BetaMessage, "content" | "stop_reason">>;
}

export const AGENT_MODEL = Symbol("AGENT_MODEL");

/**
 * Claude (T-156): Messages API + o'zimizning asboblar. Bir qadamda bitta asbob
 * (tasdiq oqimi uchun). Rad etilsa server o'zi zaxira modelda urinadi (fallbacks: "default").
 */
export class ClaudeAgentModel implements AgentModel {
  constructor(
    private readonly client: Anthropic,
    private readonly model: string,
  ) {}

  send(params: Parameters<AgentModel["send"]>[0]) {
    return this.client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Panel amallari: ko'p qadamli, lekin oddiy; Opus 5.5 standarti "medium"
      output_config: { effort: "medium" },
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      ...params,
    });
  }
}
