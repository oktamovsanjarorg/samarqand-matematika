import Anthropic from "@anthropic-ai/sdk";
import { Global, Module } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { AiHealth } from "./ai-health";
import { AGENT_MODEL, ClaudeAgentModel, type AgentModel } from "./agent-model";
import { AI_PROVIDER, DisabledAiProvider, type AiProvider } from "./ai-provider";
import { ClaudeProvider } from "./claude.provider";
import { DeepSeekAgentModel } from "./deepseek-agent";
import { DeepSeekClient, httpsTransport } from "./deepseek-client";
import { DeepSeekProvider } from "./deepseek.provider";

const deepseek = (env: Env, health?: AiHealth) =>
  new DeepSeekClient(httpsTransport(env.DEEPSEEK_API_KEY ?? ""), env.DEEPSEEK_MODEL, health);

/** AI_PROVIDER env bo'yicha: off (standart), claude yoki deepseek (T-159) */
export function createAiProvider(env: Env, health?: AiHealth): AiProvider {
  if (env.AI_PROVIDER === "claude")
    return new ClaudeProvider(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }), env.AI_MODEL);
  if (env.AI_PROVIDER === "deepseek")
    return new DeepSeekProvider(deepseek(env, health), env.DEEPSEEK_VISION_MODEL);
  return new DisabledAiProvider();
}

/** Admin agenti (T-156): AI yoqilgan bo'lsagina */
export function createAgentModel(env: Env, health?: AiHealth): AgentModel | null {
  if (env.AI_PROVIDER === "deepseek") return new DeepSeekAgentModel(deepseek(env, health));
  if (env.AI_PROVIDER !== "claude") return null;
  return new ClaudeAgentModel(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }), env.AI_MODEL);
}

@Global()
@Module({
  providers: [
    AiHealth,
    { provide: AI_PROVIDER, inject: [ENV, AiHealth], useFactory: createAiProvider },
    { provide: AGENT_MODEL, inject: [ENV, AiHealth], useFactory: createAgentModel },
  ],
  exports: [AI_PROVIDER, AGENT_MODEL, AiHealth],
})
export class AiModule {}
