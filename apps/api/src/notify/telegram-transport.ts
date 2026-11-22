import { Logger } from "@nestjs/common";

export interface LinkButton {
  text: string;
  url: string;
  /** Mini App'ni Telegram ichida ochadi (`web_app` tugmasi, T-093); aks holda oddiy havola */
  webApp?: boolean;
}

const markup = (b: LinkButton) => ({
  inline_keyboard: [[b.webApp ? { text: b.text, web_app: { url: b.url } } : { text: b.text, url: b.url }]],
});

/** Telegram'ga xabar yuborish. Testlarda soxta transport bilan almashtiriladi */
export interface TelegramTransport {
  send(chatId: bigint, html: string, button?: LinkButton): Promise<boolean>;
  /** Botning @username'i (taklif havolasi uchun, T-143); aniqlanmasa null */
  botUsername(): Promise<string | null>;
}
export const TELEGRAM_TRANSPORT = Symbol("TELEGRAM_TRANSPORT");

/** Hech narsa yubormaydi (NOTIFY_TRANSPORT=off, T-092). Xabar mazmuni logga yozilmaydi */
export const silentTransport: TelegramTransport = {
  send: () => Promise.resolve(false),
  botUsername: () => Promise.resolve(null),
};

type Wait = (ms: number) => Promise<void>;
const sleep: Wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** 429 da Telegram aytgan kutish (soniya), bo'lmasa 1 soniya; juda uzun kutish 30 soniya bilan cheklanadi */
async function retryAfterMs(res: Response): Promise<number> {
  const body = (await res.json().catch(() => null)) as { parameters?: { retry_after?: number } } | null;
  const sec = body?.parameters?.retry_after ?? 1;
  return Math.min(Math.max(sec, 1), 30) * 1000;
}

const MAX_RETRIES = 2;

/** getMe bir marta so'raladi va eslab qolinadi; xato bo'lsa null, keyingi chaqiruvda qayta so'raladi */
function cachedUsername(botToken: string, fetchFn: typeof fetch): () => Promise<string | null> {
  let known: string | null = null;
  return async () => {
    if (known) return known;
    try {
      const res = await fetchFn(`https://api.telegram.org/bot${botToken}/getMe`, {
        signal: AbortSignal.timeout(10_000),
      });
      const body = (await res.json().catch(() => null)) as { result?: { username?: unknown } } | null;
      const name = body?.result?.username;
      known = res.ok && typeof name === "string" && /^\w{5,32}$/.test(name) ? name : null;
    } catch {
      known = null;
    }
    return known;
  };
}

/**
 * Bot API orqali yuboradi. Token URL ichida: xato logiga URL yozilmaydi, faqat holat kodi.
 * 429 (juda ko'p so'rov) bo'lsa Telegram aytgan vaqtni kutib qayta urinadi (T-115).
 */
export function botApiTransport(
  botToken: string,
  fetchFn: typeof fetch = fetch,
  wait: Wait = sleep,
): TelegramTransport {
  const log = new Logger("Telegram");
  const post = (chatId: bigint, html: string, button?: LinkButton) =>
    fetchFn(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text: html,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        ...(button ? { reply_markup: markup(button) } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  return {
    botUsername: cachedUsername(botToken, fetchFn),
    async send(chatId, html, button) {
      try {
        for (let attempt = 0; ; attempt++) {
          const res = await post(chatId, html, button);
          if (res.status === 429 && attempt < MAX_RETRIES) {
            await wait(await retryAfterMs(res));
            continue;
          }
          // 403: foydalanuvchi botni bloklagan yoki hali /start bosmagan — bu odatiy holat
          if (!res.ok && res.status !== 403) log.warn(`sendMessage ${res.status}`);
          return res.ok;
        }
      } catch (e) {
        log.warn(`sendMessage: ${e instanceof Error ? e.name : "xato"}`);
        return false;
      }
    },
  };
}

/**
 * Telegram cheklovi: bot sekundiga ~30 xabar (T-115). Ommaviy yuborishda (haftalik ochilishi, e'lon)
 * xabarlar navbat bilan, oraliq saqlab ketadi; aks holda 429 bilan yo'qolardi.
 */
export function rateLimited(
  inner: TelegramTransport,
  perSecond: number,
  clock: { now: () => number; wait: Wait } = { now: Date.now, wait: sleep },
): TelegramTransport {
  const gap = 1000 / perSecond;
  let next = 0;
  return {
    async send(chatId, html, button) {
      const now = clock.now();
      const at = Math.max(now, next);
      next = at + gap;
      if (at > now) await clock.wait(at - now);
      return inner.send(chatId, html, button);
    },
    botUsername: () => inner.botUsername(),
  };
}
