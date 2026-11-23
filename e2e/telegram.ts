import type { Page } from "@playwright/test";
import { signInitData } from "@samarqand/shared/server";

export interface TgUser {
  id: number;
  first_name: string;
  username?: string;
}

/** Brauzer testlari uchun Telegram ID oralig'i: API e2e testlari bilan to'qnashmaydi, teardown shu oraliqni tozalaydi */
export const E2E_TG_MIN = 8_000_000_000;
export const E2E_TG_MAX = 8_900_000_000;
/** Brauzer testlari yaratgan kurslar nomi shu bilan boshlanadi: teardown ularni o'chiradi */
export const E2E_PREFIX = "E2E ";
export const newTgId = () => E2E_TG_MIN + Math.floor(Math.random() * (E2E_TG_MAX - E2E_TG_MIN));

function botToken(): string {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN kerak (.env)");
  return token;
}

/** Telegram Desktop/Android tungi mavzusi ranglari (themeParams) */
const DARK_THEME = {
  bg_color: "#17212b",
  secondary_bg_color: "#232e3c",
  section_bg_color: "#17212b",
  text_color: "#f5f5f5",
  hint_color: "#708499",
  link_color: "#6ab3f3",
  destructive_text_color: "#ec3942",
};

/**
 * Mini App'ni Telegram ichidagidek ochadi: telegram-web-app.js o'rniga imzolangan initData'li stub.
 * Haqiqiy Telegram skripti tarmoqdan yuklanmaydi.
 */
export async function openAsTelegram(
  page: Page,
  user: TgUser,
  path = "/",
  theme: "light" | "dark" = "light",
) {
  const initData = signInitData(
    { auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) },
    botToken(),
  );
  const stub = `window.Telegram = { WebApp: {
    initData: ${JSON.stringify(initData)}, colorScheme: ${JSON.stringify(theme)},
    themeParams: ${JSON.stringify(theme === "dark" ? DARK_THEME : {})},
    ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {},
    isVersionAtLeast() { return true; }, onEvent() {},
    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
    requestContact(cb) { window.__contactRequested = true; if (cb) cb(true); },
    openLink(url) { window.__openedLink = url; },
    // T-175: platformani test addInitScript bilan beradi (window.__tgPlatform)
    platform: window.__tgPlatform,
  } };`;
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: stub }),
  );
  await page.goto(`http://127.0.0.1:5190${path}`);
}
