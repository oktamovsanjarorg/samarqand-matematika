import "reflect-metadata";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Type } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { signInitData } from "@samarqand/shared/server";
import { AGENT_MODEL, type AgentModel } from "../src/ai/agent-model";
import { AppModule } from "../src/app.module";
import {
  TELEGRAM_TRANSPORT,
  type LinkButton,
  type TelegramTransport,
} from "../src/notify/telegram-transport";
import { loadEnv } from "../src/config/env";
import { configureApp } from "../src/setup";
import type { SolutionVerdict } from "@samarqand/shared";
import { AI_PROVIDER, type SolutionCheckInput, type TutorInput } from "../src/ai/ai-provider";

export const BOT_TOKEN = "123456:E2E_TEST_TOKEN";
export const TEST_MEDIA_DIR = join(tmpdir(), "samarqand-test-media");
export const OWNER = "e2e_owner";

export const TEST_BOT_USERNAME = "samarqand_test_bot";
/** Testlar Telegram'ga chiqmaydi: yuborilgan xabarlar shu ro'yxatga yoziladi */
export const sentMessages: { chatId: bigint; html: string; button?: LinkButton }[] = [];
const fakeTransport: TelegramTransport = {
  send: async (chatId, html, button) => {
    sentMessages.push({ chatId, html, ...(button ? { button } : {}) });
    return true;
  },
  botUsername: async () => TEST_BOT_USERNAME,
};

/** Testdagi AI: hukmni test o'zi beradi (savol matni bo'yicha), chaqiruvlar yoziladi, tarmoq yo'q */
export const testAi = {
  name: "test",
  respond: (_input: SolutionCheckInput): SolutionVerdict | null => null,
  calls: [] as SolutionCheckInput[],
  checkSolution(input: SolutionCheckInput): Promise<SolutionVerdict | null> {
    this.calls.push(input);
    return Promise.resolve(this.respond(input));
  },
  reply: (_input: TutorInput): string | null => "Qaysi formulani bilasan?",
  tutorCalls: [] as TutorInput[],
  tutor(input: TutorInput): Promise<string | null> {
    this.tutorCalls.push(input);
    return Promise.resolve(this.reply(input));
  },
};

/** Testdagi admin agenti modeli (T-156): javoblarni test navbatga qo'yadi, chaqiruvlar yoziladi */
type AgentSend = AgentModel["send"];
export const testAgent = {
  script: [] as Awaited<ReturnType<AgentSend>>[],
  calls: [] as Parameters<AgentSend>[0][],
  /** T-163: provayder xatosi (masalan, { status: 402 }) */
  fail: null as { status: number } | null,
  send(params: Parameters<AgentSend>[0]): ReturnType<AgentSend> {
    // Keyingi chaqiruv o'zgartirsa ham shu paytdagi holat qolsin
    this.calls.push(structuredClone(params));
    if (this.fail) return Promise.reject(Object.assign(new Error("provayder xatosi"), this.fail));
    return Promise.resolve(
      this.script.shift() ?? {
        content: [{ type: "text", text: "Tayyor", citations: null }],
        stop_reason: "end_turn",
      },
    );
  },
};

export async function createApp(extraControllers: Type[] = []) {
  const env = loadEnv({
    ...process.env,
    BOT_TOKEN,
    JWT_SECRET: "e2e-secret-e2e-secret",
    OWNER_USERNAMES: OWNER,
    OWNER_TELEGRAM_IDS: `${OWNER_ID}, 8000000002`,
    ALERT_TELEGRAM_IDS: String(ALERT_ID),
    // Cheklar vaqtinchalik papkaga: test repoga fayl yozmaydi
    MEDIA_DIR: TEST_MEDIA_DIR,
    // Rejalashtiruvchi testlarda o'zi ishlamaydi: tick() to'g'ridan-to'g'ri chaqiriladi
    WEEKLY_TICK_SEC: "0",
    MINIAPP_URL: "https://miniapp.test",
  });
  const mod = await Test.createTestingModule({
    imports: [AppModule.forRoot(env)],
    controllers: extraControllers,
  })
    .overrideProvider(TELEGRAM_TRANSPORT)
    .useValue(fakeTransport)
    .overrideProvider(AI_PROVIDER)
    .useValue(testAi)
    .overrideProvider(AGENT_MODEL)
    .useValue(testAgent)
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
/** Ega ID si: tasodifiy tgId oralig'idan tashqarida */
export const OWNER_ID = 8_000_000_001;
/** T-190: dasturchi (ogohlantirishlar) */
export const ALERT_ID = 8_000_000_099;
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
