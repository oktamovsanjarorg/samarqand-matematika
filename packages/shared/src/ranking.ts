/** Reytingda ko'rsatiladigan qatorlar soni */
export const RANKING_TOP = 10;

export interface RankRow {
  place: number;
  name: string;
  score: number;
  me: boolean;
}

/** Haftalik yoki umumiy reyting (BR-W10). Faqat yopilgan testlar bo'yicha (BR-W08) */
export interface Ranking {
  title: string;
  participants: number;
  top: RankRow[];
  /** O'quvchining o'z qatori (top'da bo'lmasa ham) */
  me: RankRow | null;
}

/**
 * Boshqa o'quvchilarga ko'rinadigan ism: birinchi so'z va ikkinchisining bosh harfi.
 * To'liq ism va familiya faqat ustozga ko'rinadi.
 */
export function shortName(full: string): string {
  const [first = "", second] = full.trim().split(/\s+/);
  return second ? `${first} ${second[0]}.` : first;
}

/** Bir xil ballga bir xil o'rin (1, 2, 2, 4); tenglar ichida ism bo'yicha */
export function rankRows<T extends { score: number; name: string }>(rows: T[]): (T & { place: number })[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let place = 0;
  return sorted.map((r, i) => {
    if (r.score !== sorted[i - 1]?.score) place = i + 1;
    return { ...r, place };
  });
}
