import type { MonthStats } from "@samarqand/shared";

const ddmm = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)}`;
};

/** Oxirgi 8 hafta faolligi (T-162): ustunlar = topshirilgan testlar, ostida faol o'quvchilar */
export function WeeksChart({ weeks }: { weeks: MonthStats["weeks"] }) {
  const max = Math.max(1, ...weeks.map((w) => w.topicTests + w.weeklyTests));
  return (
    <section className="card space-y-3" aria-label="Haftalik faollik">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">Oxirgi 8 hafta</h2>
        <p className="flex gap-3 text-xs text-hint">
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-brand" aria-hidden /> mavzu testi
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-accent" aria-hidden /> haftalik
          </span>
        </p>
      </div>
      {weeks.every((w) => w.topicTests + w.weeklyTests === 0) && (
        <p className="text-sm text-hint">Bu 8 haftada test topshirilmagan</p>
      )}
      <ol
        className={`flex items-end gap-1.5 ${weeks.some((w) => w.topicTests + w.weeklyTests > 0) ? "h-40" : "h-0"}`}
      >
        {weeks.map((w) => {
          const total = w.topicTests + w.weeklyTests;
          return (
            <li
              key={w.start}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              data-testid="week-bar"
              aria-label={`${ddmm(w.start)} haftasi: ${w.topicTests} mavzu testi, ${w.weeklyTests} haftalik, ${w.activeStudents} faol oʻquvchi`}
            >
              <span className="text-xs font-semibold tabular-nums">{total || ""}</span>
              <div className="flex w-full flex-col justify-end" style={{ height: `${(total / max) * 100}%` }}>
                <div className="w-full rounded-t bg-accent" style={{ flexGrow: w.weeklyTests }} />
                <div className="w-full bg-brand" style={{ flexGrow: w.topicTests }} />
              </div>
            </li>
          );
        })}
      </ol>
      <ol className="flex gap-1.5 text-center text-[11px] text-hint" aria-hidden>
        {weeks.map((w) => (
          <li key={w.start} className="min-w-0 flex-1">
            <span className="block tabular-nums">{ddmm(w.start)}</span>
            <span className="block tabular-nums">{w.activeStudents} faol</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
