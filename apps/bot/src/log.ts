import { GrammyError, HttpError } from "grammy";

/**
 * Logga yoziladigan xato (T-141): shaxsiy ma'lumotsiz. GrammyError ichida yuborilgan xabar (payload: chat_id,
 * matndagi ism) bo'ladi: u yozilmaydi, faqat metod, kod va Telegram tavsifi.
 */
export function describeBotError(e: unknown): string {
  if (e instanceof GrammyError) return `GrammyError ${e.method} ${e.error_code}: ${e.description}`;
  if (e instanceof HttpError) return `HttpError: ${e.error instanceof Error ? e.error.name : "tarmoq"}`;
  if (!(e instanceof Error)) return "Nomaʼlum xato";
  // Ichki API xatosi faqat holat kodi bilan yaratiladi (internal-api.ts)
  return /^API \d{3}$/.test(e.message) ? e.message : e.name;
}
