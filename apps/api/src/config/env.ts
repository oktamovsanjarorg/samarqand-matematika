import { z } from "zod";

/** Env Zod bilan tekshiriladi: majburiy qiymat yo'q bo'lsa API ishga tushmaydi */
/** .env.example dagi bo'sh kalit (`X=`) — berilmagan deb hisoblanadi */
const optionalKey = z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional());

const base = z.object({
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
  // Ega (TEACHER) bo'ladigan Telegram ID'lar: vergul bilan. Username o'zgarishi mumkin, ID o'zgarmaydi
  OWNER_TELEGRAM_IDS: z
    .string()
    .default("")
    .refine(
      (v) => v.split(",").every((x) => /^\d*$/.test(x.trim())),
      "OWNER_TELEGRAM_IDS: faqat raqamlar, vergul bilan",
    ),
  // Admin panel manzili: bot yuboradigan bir martalik kirish havolasi uchun
  ADMIN_URL: z.string().url().default("http://127.0.0.1:5191/admin"),
  // Mini App manzili: o'quvchi xabarlaridagi "ilovada ochish" tugmasi uchun (T-093). Yo'q bo'lsa tugma qo'yilmaydi
  MINIAPP_URL: z
    .string()
    .url()
    .startsWith("https://", "MINIAPP_URL https:// bilan boshlanishi kerak")
    .optional(),
  ADMIN_JWT_TTL: z.string().default("12h"),
  // Bitta IP'dan daqiqasiga kirish so'rovlari (maktab Wi-Fi'da butun sinf bitta IP'da bo'ladi)
  RATE_LIMIT_AUTH_PER_MIN: z.coerce.number().int().min(10).default(120),
  /** Bitta IP'dan daqiqasiga umumiy so'rovlar (maktab Wi-Fi'da butun sinf bitta IP'da) */
  RATE_LIMIT_PER_MIN: z.coerce.number().int().min(60).default(600),
  // Yuklangan fayllar (to'lov cheklari): production'da docker volume (/app/media)
  MEDIA_DIR: z.string().min(1).default("./media"),
  // Haftalik test rejalashtiruvchisi (eslatma va yopish) necha soniyada bir ishlaydi; 0 — o'chiq (testlarda)
  WEEKLY_TICK_SEC: z.coerce.number().int().min(0).default(60),
  // Bot xabarlari (T-092): off — Telegram'ga hech narsa yuborilmaydi (brauzer testlari: ularning
  // tasodifiy Telegram ID'lari haqiqiy foydalanuvchiga to'g'ri kelib qolmasin)
  NOTIFY_TRANSPORT: z.enum(["telegram", "off"]).default("telegram"),
  // Yechim tekshiruvi (ADR-0004): off — AI'siz, hamma savol ustoz navbatiga
  AI_PROVIDER: z.enum(["off", "claude", "deepseek"]).default("off"),
  ANTHROPIC_API_KEY: optionalKey,
  // DeepSeek (T-159): matnli ishlar (yordamchi, admin agenti); yechim rasmini o'qimaydi
  DEEPSEEK_API_KEY: optionalKey,
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-v4-pro"),
  /** Rasmli so'rovlar (T-170): deepseek-flash rasm ko'radi */
  DEEPSEEK_VISION_MODEL: z.string().min(1).default("deepseek-flash"),
  // Baholash to'plamida modellarni solishtirish uchun
  AI_MODEL: z.string().min(1).default("claude-opus-5-5"),
  // Kuniga ko'pi bilan nechta AI tekshiruvi (xarajat chegarasi)
  AI_DAILY_LIMIT: z.coerce.number().int().min(0).default(300),
  // AI yordamchi: bir o'quvchiga kuniga nechta xabar (BR-T03, Q-06)
  TUTOR_DAILY_LIMIT: z.coerce.number().int().min(0).default(30),
  // Admin agenti (T-156): bir xodimga kuniga nechta model chaqiruvi (xarajat chegarasi)
  AGENT_DAILY_LIMIT: z.coerce.number().int().min(0).default(200),
});

const schema = base
  .refine((e) => e.AI_PROVIDER !== "claude" || !!e.ANTHROPIC_API_KEY, {
    message: "AI_PROVIDER=claude uchun ANTHROPIC_API_KEY kerak",
    path: ["ANTHROPIC_API_KEY"],
  })
  .refine((e) => e.AI_PROVIDER !== "deepseek" || !!e.DEEPSEEK_API_KEY, {
    message: "AI_PROVIDER=deepseek uchun DEEPSEEK_API_KEY kerak",
    path: ["DEEPSEEK_API_KEY"],
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
