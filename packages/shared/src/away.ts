import { z } from "zod";

/** Bitta chiqishning eng uzun hisobga olinadigan vaqti: undan uzuni ilova yopilib qolgan deb hisoblanadi */
export const AWAY_MAX_MS = 30 * 60_000;

/** T-193: o'quvchi ilovaga qaytganda yuboradi: tashqarida qancha bo'lgani */
export const awayBody = z.object({ ms: z.number().int().min(0).max(AWAY_MAX_MS) });

/**
 * Signal chegarasi (ona tili loyihasidagidek): 5 martadan ko'p yoki jami 2 daqiqadan ko'p tashqarida.
 * Bu dalil emas, signal: o'quvchiga va ota-onaga ko'rsatilmaydi, faqat ustoz navbatida (BR-W05 kabi).
 */
export const AWAY_SIGNAL = { count: 5, ms: 2 * 60_000 } as const;

export interface AwaySignal {
  count: number;
  ms: number;
}

export const awaySignal = (count: number, ms: number): AwaySignal | null =>
  count > AWAY_SIGNAL.count || ms > AWAY_SIGNAL.ms ? { count, ms } : null;

/** "7 marta · 3 daqiqa" */
export function awayLabel(a: AwaySignal): string {
  const min = Math.round(a.ms / 60_000);
  return `${a.count} marta · ${min < 1 ? "1 daqiqadan kam" : `${min} daqiqa`}`;
}
