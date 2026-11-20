import "reflect-metadata";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Type } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { signInitData } from "@samarqand/shared/server";
import { AppModule } from "../src/app.module";
import { TELEGRAM_TRANSPORT, type TelegramTransport } from "../src/notify/telegram-transport";
import { loadEnv } from "../src/config/env";
import { configureApp } from "../src/setup";

export const BOT_TOKEN = "123456:E2E_TEST_TOKEN";
export const TEST_MEDIA_DIR = join(tmpdir(), "samarqand-test-media");
export const OWNER = "e2e_owner";

/** Testlar Telegram'ga chiqmaydi: yuborilgan xabarlar shu ro'yxatga yoziladi */
export const sentMessages: { chatId: bigint; html: string; button?: { text: string; url: string } }[] = [];
const fakeTransport: TelegramTransport = {
  send: async (chatId, html, button) => {
    sentMessages.push({ chatId, html, ...(button ? { button } : {}) });
    return true;
  },
};

export async function createApp(extraControllers: Type[] = []) {
  const env = loadEnv({
    ...process.env,
    BOT_TOKEN,
    JWT_SECRET: "e2e-secret-e2e-secret",
    OWNER_USERNAMES: OWNER,
    // Cheklar vaqtinchalik papkaga: test repoga fayl yozmaydi
    MEDIA_DIR: TEST_MEDIA_DIR,
  });
  const mod = await Test.createTestingModule({
    imports: [AppModule.forRoot(env)],
    controllers: extraControllers,
  })
    .overrideProvider(TELEGRAM_TRANSPORT)
    .useValue(fakeTransport)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await configureApp(app, { rateLimit: false });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export function initData(user: object, botToken = BOT_TOKEN) {
  const authDate = String(Math.floor(Date.now() / 1000));
  return signInitData({ auth_date: authDate, user: JSON.stringify(user) }, botToken);
}

/** Har test uchun noyob Telegram ID: testlar bir-birining yozuvlariga tegmaydi */
export const tgId = () => 9_000_000_000 + Math.floor(Math.random() * 1_000_000_000);

/** Telegram orqali kirib, Authorization sarlavhasini qaytaradi. owner: true bo'lsa TEACHER (OWNER_USERNAMES) */
export async function loginAs(app: NestFastifyApplication, opts: { owner?: boolean } = {}) {
  const id = tgId();
  const user = {
    id,
    first_name: opts.owner ? "Ustoz" : "Oquvchi",
    ...(opts.owner ? { username: OWNER } : {}),
  };
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/telegram",
    payload: { initData: initData(user) },
  });
  const { token } = res.json() as { token: string };
  return { telegramId: BigInt(id), headers: { authorization: `Bearer ${token}` } };
}
