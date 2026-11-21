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
}
export const TELEGRAM_TRANSPORT = Symbol("TELEGRAM_TRANSPORT");

/** Hech narsa yubormaydi (NOTIFY_TRANSPORT=off, T-092). Xabar mazmuni logga yozilmaydi */
export const silentTransport: TelegramTransport = { send: () => Promise.resolve(false) };

/** Bot API orqali yuboradi. Token URL ichida: xato logiga URL yozilmaydi, faqat holat kodi */
export function botApiTransport(botToken: string, fetchFn: typeof fetch = fetch): TelegramTransport {
  const log = new Logger("Telegram");
  return {
    async send(chatId, html, button) {
      try {
        const res = await fetchFn(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
        // 403: foydalanuvchi botni bloklagan yoki hali /start bosmagan — bu odatiy holat
        if (!res.ok && res.status !== 403) log.warn(`sendMessage ${res.status}`);
        return res.ok;
      } catch (e) {
        log.warn(`sendMessage: ${e instanceof Error ? e.name : "xato"}`);
        return false;
      }
    },
  };
}
