import { createHmac, timingSafeEqual } from "node:crypto";
import { telegramProfileSchema, type TelegramProfile } from "./telegram-profile";

export type TelegramInitUser = TelegramProfile;

export interface ValidatedInitData {
  user: TelegramInitUser;
  authDate: Date;
  startParam?: string;
}

export class InitDataError extends Error {}

/**
 * Telegram Mini App initData'ni HMAC-SHA256 orqali tekshiradi.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86400,
  now: Date = new Date(),
): ValidatedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new InitDataError("hash yo'q");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new InitDataError("imzo noto'g'ri");
  }

  const authDateSec = Number(params.get("auth_date"));
  if (!authDateSec) throw new InitDataError("auth_date yo'q");
  if (now.getTime() / 1000 - authDateSec > maxAgeSec) {
    throw new InitDataError("initData eskirgan");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new InitDataError("user yo'q");
  const user = parseUser(userRaw);

  return {
    user,
    authDate: new Date(authDateSec * 1000),
    startParam: params.get("start_param") ?? undefined,
  };
}

function parseUser(raw: string): TelegramInitUser {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new InitDataError("user JSON emas");
  }
  const parsed = telegramProfileSchema.safeParse(json);
  if (!parsed.success) throw new InitDataError("user maydonlari noto'g'ri");
  return parsed.data;
}

/** Testlar va lokal dev uchun: imzolangan initData yasaydi */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const dataCheckString = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
}

/** Bot va API o'rtasidagi ichki so'rovlar kaliti (ikkalasida ham BOT_TOKEN bor) */
export function internalKey(botToken: string): string {
  return createHmac("sha256", "samarqand-internal").update(botToken).digest("hex");
}
