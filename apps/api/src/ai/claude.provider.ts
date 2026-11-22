import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { Logger } from "@nestjs/common";
import { solutionVerdict, type SolutionVerdict } from "@samarqand/shared";
import type { AiProvider, SolutionCheckInput, SolutionPhotoInput, TutorInput } from "./ai-provider";
import { SOLUTION_SYSTEM, solutionUserText } from "./solution-prompt";
import { tutorSystem } from "./tutor-prompt";

export const CLAUDE_MODEL = "claude-opus-5-5";

const imageBlocks = (photos: SolutionPhotoInput[]) =>
  photos.map((p) => ({
    type: "image" as const,
    source: { type: "base64" as const, media_type: p.type, data: p.data.toString("base64") },
  }));

/**
 * Claude (ADR-0004): vision + structured outputs. Rad etilsa (refusal) server o'zi
 * zaxira modelda qayta urinadi (fallbacks: "default"). Xato bo'lsa null — oqim AI'siz davom etadi.
 */
export class ClaudeProvider implements AiProvider {
  readonly name = "claude";
  private readonly log = new Logger("Claude");

  constructor(
    private readonly client: Anthropic,
    private readonly model: string = CLAUDE_MODEL,
  ) {}

  async checkSolution(input: SolutionCheckInput): Promise<SolutionVerdict | null> {
    const images = imageBlocks(input.photos);
    try {
      const res = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // Baholash aniqlik talab qiladi; Opus 5.5 da standart "medium"
        output_config: { effort: "high", format: betaZodOutputFormat(solutionVerdict) },
        system: [{ type: "text", text: SOLUTION_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: [...images, { type: "text", text: solutionUserText(input) }] }],
      });
      if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") {
        this.log.warn(`hukm yo'q: ${res.stop_reason}`);
        return null;
      }
      return res.parsed_output;
    } catch (e) {
      return this.failed(e);
    }
  }

  /** Yordamchi: rejim qoidasi + server tuzgan kontekst tizimda; suhbat tarixi xabarlarda */
  async tutor(input: TutorInput): Promise<string | null> {
    const last = input.history.length - 1;
    // Rasmlar (yechim rasmlari, T-170: o'quvchi yuborgan rasm) oxirgi o'quvchi xabariga biriktiriladi
    const messages: Anthropic.Beta.BetaMessageParam[] = input.history.map((m, i) => ({
      role: m.role,
      content:
        i === last && input.photos.length
          ? [...imageBlocks(input.photos), { type: "text" as const, text: m.text }]
          : m.text,
    }));
    try {
      const res = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // Suhbat: tezlik muhim, matematik aniqlik ham; Opus 5.5 standarti "medium"
        output_config: { effort: "medium" },
        system: [
          { type: "text", text: tutorSystem(input.mode), cache_control: { type: "ephemeral" } },
          { type: "text", text: `Kontekst:\n${input.context}` },
        ],
        messages,
      });
      if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") {
        this.log.warn(`yordamchi javobsiz: ${res.stop_reason}`);
        return null;
      }
      const text = res.content
        .flatMap((b) => (b.type === "text" ? [b.text] : []))
        .join("\n")
        .trim();
      return text || null;
    } catch (e) {
      return this.failed(e);
    }
  }

  /** Kalit yoki so'rov xatosi — faqat nomi logga (sir bo'lmaydi), oqim to'xtamaydi */
  private failed(e: unknown): null {
    if (e instanceof Anthropic.APIError) this.log.warn(`API ${e.status ?? "?"}: ${e.name}`);
    else this.log.warn(`xato: ${e instanceof Error ? e.name : "nomaʼlum"}`);
    return null;
  }
}
