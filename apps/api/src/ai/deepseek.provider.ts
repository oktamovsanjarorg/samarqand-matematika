import { Logger } from "@nestjs/common";
import type { SolutionVerdict } from "@samarqand/shared";
import type { AiProvider, TutorInput } from "./ai-provider";
import type { DeepSeekClient, DsMessage } from "./deepseek-client";
import { tutorSystem } from "./tutor-prompt";

/** DeepSeek rasmni o'qimaydi: o'quvchiga shuni aytamiz, javobni matn bo'yicha beradi */
const NO_PHOTOS =
  "Eslatma: o'quvchi yechim rasmini yuborgan, lekin sen rasmni ko'ra olmaysan. Rasm haqida taxmin qilma.";

/**
 * DeepSeek (T-159): matnli ishlar arzon modelda. Yechim rasmini tekshirish (checkSolution) vision talab qiladi —
 * DeepSeek'da yo'q, shuning uchun hukm berilmaydi va javob ustoz navbatiga tushadi (BR-W06).
 */
export class DeepSeekProvider implements AiProvider {
  readonly name = "deepseek";
  private readonly log = new Logger("DeepSeek");

  constructor(private readonly client: DeepSeekClient) {}

  checkSolution(): Promise<SolutionVerdict | null> {
    return Promise.resolve(null);
  }

  async tutor(input: TutorInput): Promise<string | null> {
    const system = [tutorSystem(input.mode), `Kontekst:\n${input.context}`];
    if (input.photos.length) system.push(NO_PHOTOS);
    const messages: DsMessage[] = [
      { role: "system", content: system.join("\n\n") },
      ...input.history.map((m) => ({ role: m.role, content: m.text }) as DsMessage),
    ];
    try {
      const r = await this.client.chat({ messages, maxTokens: 2000 });
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
