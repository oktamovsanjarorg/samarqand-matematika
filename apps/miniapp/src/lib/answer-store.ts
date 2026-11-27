import type { Response } from "./answers";

const PREFIX = "skd-ans:";

/**
 * T-192: serverga hali yetmagan javoblar telefonda (ona tili loyihasidagidek). Internet yo'qligida ilova
 * yopilsa yoki telefon o'chsa ham javob yo'qolmaydi: qayta ochilganda ekranda turadi va serverga ketadi.
 * Faqat o'quvchining o'z javobi saqlanadi (to'g'ri javob kliyentda yo'q). Hammasi saqlangach yozuv o'chadi.
 */
export function answerStore(base: string, attemptId: string) {
  const key = `${PREFIX}${base}:${attemptId}`;
  return {
    load(questionIds: string[]): Map<string, Response> {
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, Response>;
        return new Map(questionIds.filter((id) => id in saved).map((id) => [id, saved[id] as Response]));
      } catch {
        return new Map();
      }
    },
    save(unsaved: Map<string, Response>): void {
      try {
        if (unsaved.size) localStorage.setItem(key, JSON.stringify(Object.fromEntries(unsaved)));
        else localStorage.removeItem(key);
      } catch {
        // Xotira yopiq yoki to'la: javob baribir serverga yuborilmoqda
      }
    },
  };
}
