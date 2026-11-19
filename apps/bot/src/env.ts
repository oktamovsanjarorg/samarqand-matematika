import { z } from "zod";

const schema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN kerak"),
  // Telegram Mini App faqat HTTPS manzil bilan ochiladi
  MINIAPP_URL: z.string().url().startsWith("https://", "MINIAPP_URL https:// bilan boshlanishi kerak"),
  BRAND_NAME: z.string().default("Samarqand matematika maktabi"),
  // API'ning ichki manzili (bot va API bir tarmoqda)
  API_INTERNAL_URL: z.string().url().default("http://127.0.0.1:4300/api"),
});

export type BotEnv = z.infer<typeof schema>;

export function loadBotEnv(source: NodeJS.ProcessEnv = process.env): BotEnv {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Env xato: ${msg}`);
  }
  return parsed.data;
}
