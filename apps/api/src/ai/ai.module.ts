import Anthropic from "@anthropic-ai/sdk";
import { Global, Module } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { AGENT_MODEL, ClaudeAgentModel, type AgentModel } from "./agent-model";
import { AI_PROVIDER, DisabledAiProvider, type AiProvider } from "./ai-provider";
import { ClaudeProvider } from "./claude.provider";

/** AI_PROVIDER env bo'yicha: off (standart) yoki claude */
export function createAiProvider(env: Env): AiProvider {
  if (env.AI_PROVIDER === "claude")
    return new ClaudeProvider(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }), env.AI_MODEL);
  return new DisabledAiProvider();
}

/** Admin agenti (T-156): AI yoqilgan bo'lsagina */
export function createAgentModel(env: Env): AgentModel | null {
  if (env.AI_PROVIDER !== "claude") return null;
  return new ClaudeAgentModel(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }), env.AI_MODEL);
}

@Global()
@Module({
  providers: [
    { provide: AI_PROVIDER, inject: [ENV], useFactory: createAiProvider },
    { provide: AGENT_MODEL, inject: [ENV], useFactory: createAgentModel },
  ],
  exports: [AI_PROVIDER, AGENT_MODEL],
})
export class AiModule {}
