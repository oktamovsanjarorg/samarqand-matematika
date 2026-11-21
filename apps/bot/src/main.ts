import { Bot, Keyboard } from "grammy";
import { loadBotEnv } from "./env";
import { createInternalApi, profileOf } from "./internal-api";
import {
  ADMIN_FAILED,
  ADMIN_NOT_STAFF,
  PARENT_ASK_CONTACT,
  PARENT_ONLY_STUDENT,
  PARENT_REPLIES,
  PHONE_REPLIES,
  SHARE_CONTACT_BUTTON,
  adminLinkMessage,
  fallbackMessage,
  parentInviteMessage,
  startMessage,
} from "./messages";
import { createPendingStore } from "./pending";

const env = loadBotEnv();
const bot = new Bot(env.BOT_TOKEN);
const api = createInternalApi({ baseUrl: env.API_INTERNAL_URL, botToken: env.BOT_TOKEN });
const pendingParents = createPendingStore();
const logError = (where: string, e: unknown) =>
  console.error(`${where}:`, e instanceof Error ? e.message : e);

bot.command("start", async (ctx) => {
  // Ota-ona havolasi: t.me/<bot>?start=p_<kod>
  const code = /^p_([0-9A-Fa-f]{8})$/.exec(ctx.match)?.[1];
  if (code && ctx.from && ctx.chat.type === "private") {
    pendingParents.set(ctx.from.id, code.toUpperCase());
    const keyboard = new Keyboard().requestContact(SHARE_CONTACT_BUTTON).oneTime().resized();
    await ctx.reply(PARENT_ASK_CONTACT, { reply_markup: keyboard });
    return;
  }
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
    logError("admin havola", e);
    await ctx.reply(ADMIN_FAILED);
  }
});

// O'quvchi: ota-onaga yuboriladigan havola
bot.command("ota", async (ctx) => {
  if (ctx.chat.type !== "private" || !ctx.from) return;
  try {
    const { code } = await api.parentCode(profileOf(ctx.from));
    if (!code) {
      await ctx.reply(PARENT_ONLY_STUDENT);
      return;
    }
    const { text, keyboard } = parentInviteMessage(`https://t.me/${ctx.me.username}?start=p_${code}`);
    await ctx.reply(text, { reply_markup: keyboard });
  } catch (e) {
    logError("ota kodi", e);
    await ctx.reply(PHONE_REPLIES.failed);
  }
});

// Raqam ulashish: ota-ona havolasidan keyin yoki o'quvchining o'zi (Mini App requestContact)
bot.on("message:contact", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const { phone_number, user_id } = ctx.message.contact;
  const body = { from: profileOf(ctx.from), contact: { phone_number, user_id } };
  const code = pendingParents.take(ctx.from.id);
  let reply: string = PHONE_REPLIES.failed;
  try {
    reply = code
      ? (PARENT_REPLIES[(await api.parentLink({ ...body, code })).status] ?? reply)
      : PHONE_REPLIES[(await api.userPhone(body)).status];
  } catch (e) {
    logError("raqam", e);
  }
  await ctx.reply(reply, { reply_markup: { remove_keyboard: true } });
});

// T-129: buyruq bo'lmagan matn (savol, salom). Guruhda jim turadi
bot.on("message:text", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const { text, keyboard } = fallbackMessage(env.MINIAPP_URL);
  await ctx.reply(text, { reply_markup: keyboard });
});

bot.catch((err) => console.error("Bot xatosi:", err.error));

/** Menyu tugmasi (chap pastda "Ilova") va buyruqlar ro'yxati: har ishga tushishda bir xil holatga keltiriladi */
async function setupMenu() {
  await bot.api.setMyCommands([
    { command: "start", description: "Ilovani ochish" },
    { command: "ota", description: "Ota-onani ulash" },
  ]);
  await bot.api.setChatMenuButton({
    menu_button: { type: "web_app", text: "Ilova", web_app: { url: env.MINIAPP_URL } },
  });
}

setupMenu().catch((e: unknown) => console.error("Menyu sozlanmadi:", e instanceof Error ? e.message : e));

// Bot faqat bitta nusxada ishlaydi: ikkinchi nusxa Telegram'dan 409 oladi
void bot.start({ onStart: (me) => console.info(`Bot: @${me.username}`) });

// T-136: docker stop (SIGTERM): joriy xabar ishlovi tugaydi, long polling to'xtaydi; 10 s kutib SIGKILL bo'lmaydi
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => {
    void bot.stop().finally(() => process.exit(0));
  });
