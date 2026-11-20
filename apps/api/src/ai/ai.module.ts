import Anthropic from "@anthropic-ai/sdk";
import { Global, Module } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { AI_PROVIDER, DisabledAiProvider, type AiProvider } from "./ai-provider";
import { ClaudeProvider } from "./claude.provider";

/** AI_PROVIDER env bo'yicha: off (standart) yoki claude */
export function createAiProvider(env: Env): AiProvider {
  if (env.AI_PROVIDER === "claude")
    return new ClaudeProvider(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }), env.AI_MODEL);
  return new DisabledAiProvider();
}

@Global()
@Module({
  providers: [{ provide: AI_PROVIDER, inject: [ENV], useFactory: createAiProvider }],
  exports: [AI_PROVIDER],
})
export class AiModule {}
