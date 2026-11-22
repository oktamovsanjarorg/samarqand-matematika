/** T-151: server javob bermaganda foydalanuvchiga ko'rinadigan xabarlar (Mini App va admin bir xil) */
export const OFFLINE_MESSAGE = "Internetga ulanib boʻlmadi. Qayta urinib koʻring.";
export const UNAVAILABLE_MESSAGE = "Server yangilanmoqda. Bir daqiqadan soʻng qayta urinib koʻring.";
export const FALLBACK_ERROR = "Xatolik yuz berdi";

/**
 * API xabari bo'lsa o'shani, bo'lmasa status bo'yicha xabar.
 * 502/503/504 tanasiz keladi: yangilanish (deploy) paytida API qayta ishga tushayotganda proxy shuni qaytaradi.
 */
export function httpErrorMessage(status: number, message?: string): string {
  if (message) return message;
  if (status === 502 || status === 503 || status === 504) return UNAVAILABLE_MESSAGE;
  return FALLBACK_ERROR;
}
