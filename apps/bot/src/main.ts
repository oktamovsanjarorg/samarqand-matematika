import { Bot } from "grammy";
import { loadBotEnv } from "./env";
import { createInternalApi, profileOf } from "./internal-api";
import { ADMIN_FAILED, ADMIN_NOT_STAFF, adminLinkMessage, startMessage } from "./messages";

const env = loadBotEnv();
const bot = new Bot(env.BOT_TOKEN);
const api = createInternalApi({ baseUrl: env.API_INTERNAL_URL, botToken: env.BOT_TOKEN });

bot.command("start", async (ctx) => {
  const { text, keyboard } = startMessage({
    firstName: ctx.from?.first_name ?? "",
    brand: env.BRAND_NAME,
    miniappUrl: env.MINIAPP_URL,
  });
  await ctx.reply(text, { reply_markup: keyboard });
});

// Kirish havolasi faqat shaxsiy chatda beriladi: guruhda boshqalar ko'rib qolmasligi uchun
bot.command("admin", async (ctx) => {
  if (ctx.chat.type !== "private" || !ctx.from) return;
  try {
    const { url } = await api.adminLoginLink(profileOf(ctx.from));
    if (!url) {
      await ctx.reply(ADMIN_NOT_STAFF);
      return;
    }
    const { text, keyboard } = adminLinkMessage(url);
    await ctx.reply(text, { reply_markup: keyboard });
  } catch (e) {
    console.error("admin havola:", e instanceof Error ? e.message : e);
    await ctx.reply(ADMIN_FAILED);
  }
});

bot.catch((err) => console.error("Bot xatosi:", err.error));

// Bot faqat bitta nusxada ishlaydi: ikkinchi nusxa Telegram'dan 409 oladi
void bot.start({ onStart: (me) => console.info(`Bot: @${me.username}`) });
