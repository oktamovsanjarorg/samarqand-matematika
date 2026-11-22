import { Logger } from "@nestjs/common";
import type { SolutionVerdict } from "@samarqand/shared";
import type { AiProvider, SolutionPhotoInput, TutorInput } from "./ai-provider";
import type { DeepSeekClient, DsContentPart, DsMessage } from "./deepseek-client";
import { tutorSystem } from "./tutor-prompt";

const imageParts = (photos: SolutionPhotoInput[]): DsContentPart[] =>
  photos.map((p) => ({
    type: "image_url",
    image_url: { url: `data:${p.type};base64,${p.data.toString("base64")}` },
  }));

/**
 * DeepSeek (T-159): matnli ishlar arzon modelda. Yechim rasmini tekshirish (checkSolution) vision talab qiladi —
 * DeepSeek'da yo'q, shuning uchun hukm berilmaydi va javob ustoz navbatiga tushadi (BR-W06).
 */
const NO_VISION =
  "Eslatma: o'quvchi rasm yuborgan, lekin sen rasmni ko'ra olmaysan. Rasm haqida taxmin qilma.";

export class DeepSeekProvider implements AiProvider {
  readonly name = "deepseek";
  private readonly log = new Logger("DeepSeek");

  constructor(
    private readonly client: DeepSeekClient,
    /** Rasm ko'radigan model (T-170): rasm bo'lgan so'rov shunga boradi */
    private readonly visionModel?: string,
  ) {}

  checkSolution(): Promise<SolutionVerdict | null> {
    return Promise.resolve(null);
  }

  async tutor(input: TutorInput): Promise<string | null> {
    const system = [tutorSystem(input.mode), `Kontekst:\n${input.context}`].join("\n\n");
    const last = input.history.length - 1;
    const images = input.photos.length && this.visionModel ? imageParts(input.photos) : [];
    // Rasmlar oxirgi o'quvchi xabariga; vision modeli sozlanmagan bo'lsa matn bilan javob beradi
    const messages: DsMessage[] = [
      {
        role: "system",
        content: images.length || !input.photos.length ? system : `${system}\n\n${NO_VISION}`,
      },
      ...input.history.map((m, i): DsMessage =>
        m.role === "assistant"
          ? { role: "assistant", content: m.text }
          : {
              role: "user",
              content: i === last && images.length ? [...images, { type: "text", text: m.text }] : m.text,
            },
      ),
    ];
    try {
      const r = await this.client.chat({
        messages,
        maxTokens: 2000,
        ...(images.length ? { model: this.visionModel } : {}),
      });
      if (r.finish_reason !== "stop") {
        this.log.warn(`yordamchi javobsiz: ${r.finish_reason}`);
        return null;
      }
      return r.message.content?.trim() || null;
    } catch (e) {
      this.log.warn(`xato: ${e instanceof Error ? e.message : "nomaʼlum"}`);
      return null;
    }
  }
}
