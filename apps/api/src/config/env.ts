import { z } from "zod";

/** Env Zod bilan tekshiriladi: majburiy qiymat yo'q bo'lsa API ishga tushmaydi */
const schema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.coerce.number().default(4300),
  API_HOST: z.string().default("127.0.0.1"),
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN kerak"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET kamida 16 belgi"),
  JWT_TTL: z.string().default("1h"),
  INIT_DATA_MAX_AGE_SEC: z.coerce.number().default(86400),
  CORS_ORIGINS: z.string().default("http://127.0.0.1:5190,http://127.0.0.1:5191"),
  // Ega (TEACHER) bo'ladigan Telegram username'lar: vergul bilan, @ belgisisiz
  OWNER_USERNAMES: z.string().default(""),
  // Admin panel manzili: bot yuboradigan bir martalik kirish havolasi uchun
  ADMIN_URL: z.string().url().default("http://127.0.0.1:5191/admin"),
  ADMIN_JWT_TTL: z.string().default("12h"),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Env xato: ${msg}`);
  }
  return parsed.data;
}

export const ENV = Symbol("ENV");
