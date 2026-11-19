import { Bot } from "grammy";
import { loadBotEnv } from "./env";
import { startMessage } from "./messages";

const env = loadBotEnv();
const bot = new Bot(env.BOT_TOKEN);

bot.command("start", async (ctx) => {
  const { text, keyboard } = startMessage({
    firstName: ctx.from?.first_name ?? "",
    brand: env.BRAND_NAME,
    miniappUrl: env.MINIAPP_URL,
  });
  await ctx.reply(text, { reply_markup: keyboard });
});

bot.catch((err) => console.error("Bot xatosi:", err.error));

// Bot faqat bitta nusxada ishlaydi: ikkinchi nusxa Telegram'dan 409 oladi
void bot.start({ onStart: (me) => console.info(`Bot: @${me.username}`) });
