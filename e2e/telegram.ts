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
export const newTgId = () => E2E_TG_MIN + Math.floor(Math.random() * (E2E_TG_MAX - E2E_TG_MIN));

function botToken(): string {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN kerak (.env)");
  return token;
}

/**
 * Mini App'ni Telegram ichidagidek ochadi: telegram-web-app.js o'rniga imzolangan initData'li stub.
 * Haqiqiy Telegram skripti tarmoqdan yuklanmaydi.
 */
export async function openAsTelegram(page: Page, user: TgUser, path = "/") {
  const initData = signInitData(
    { auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) },
    botToken(),
  );
  const stub = `window.Telegram = { WebApp: {
    initData: ${JSON.stringify(initData)}, colorScheme: "light", themeParams: {},
    ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {},
    isVersionAtLeast() { return true; }, onEvent() {},
  } };`;
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: stub }),
  );
  await page.goto(`http://127.0.0.1:5190${path}`);
}
