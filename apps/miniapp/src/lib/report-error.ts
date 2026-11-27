import type { ClientErrorBody } from "@samarqand/shared";
import { ApiError } from "./api";
import { tg } from "./telegram";

/** Bitta yuklanishda ko'pi bilan nechta xato yuboriladi */
const MAX_PER_LOAD = 3;
/** Tarmoq uzilishi va eskirgan chunk nosozlik emas (ular uchun qayta yuklash bor) */
const IGNORED =
  /Failed to fetch|Load failed|NetworkError|network error|aborted|dynamically imported module|Importing a module script failed/i;
const seen = new Set<string>();

/**
 * T-190: kutilmagan xato serverga (dasturchiga) yuboriladi: telefonda oq ekran bo'lsa ham sabab ko'rinadi.
 * API xatolari (ApiError) yuborilmaydi: ular serverda allaqachon ko'rinadi.
 * Manzil faqat yo'l: query va hash'da initData yoki token bo'lishi mumkin.
 */
export function reportError(error: unknown): void {
  if (error instanceof ApiError) return;
  const e = error instanceof Error ? error : new Error(String(error));
  const message = `${e.name}: ${e.message}`.slice(0, 300);
  if (IGNORED.test(message) || seen.has(message) || seen.size >= MAX_PER_LOAD) return;
  seen.add(message);
  const body: ClientErrorBody = {
    app: "miniapp",
    message,
    page: location.pathname.slice(0, 200),
    client: (tg?.platform ? `${tg.platform} ${tg.version ?? ""}` : navigator.userAgent).slice(0, 120),
    ...(e.stack ? { where: e.stack.split("\n").slice(0, 6).join("\n").slice(0, 600) } : {}),
  };
  fetch("/api/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

/** Render'dan tashqaridagi xatolar (hodisa, setTimeout, ushlanmagan promise) */
export function reportUncaught(): void {
  // Rasm yoki skript yuklanmasa ham "error" keladi, lekin event.error bo'lmaydi: ular yuborilmaydi
  window.addEventListener("error", (event) => {
    if (event.error) reportError(event.error);
  });
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason));
}
