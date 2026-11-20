import { percentOf, type AttemptSummary, type MyStats } from "@samarqand/shared";

type TopicRow = MyStats["topics"][number];

/** Urinishlardan mavzular jadvali: eng past natijali mavzu birinchi (qayta ishlash uchun) */
export function topicTable(attempts: AttemptSummary[]): TopicRow[] {
  const map = new Map<string, TopicRow>();
  for (const a of attempts) {
    const row = map.get(a.topicId) ?? {
      topicId: a.topicId,
      topicTitle: a.topicTitle,
      attempts: 0,
      bestPercent: null,
    };
    const p = percentOf(a.correct, a.checkable);
    row.attempts += 1;
    if (p !== null && (row.bestPercent === null || p > row.bestPercent)) row.bestPercent = p;
    map.set(a.topicId, row);
  }
  return [...map.values()].sort((x, y) => (x.bestPercent ?? 101) - (y.bestPercent ?? 101));
}

/** O'rtacha foiz: faqat avtomatik tekshiriladigan savoli bor urinishlar */
export function averagePercent(attempts: AttemptSummary[]): number | null {
  const ps = attempts.map((a) => percentOf(a.correct, a.checkable)).filter((p): p is number => p !== null);
  return ps.length ? Math.round(ps.reduce((s, p) => s + p, 0) / ps.length) : null;
}
