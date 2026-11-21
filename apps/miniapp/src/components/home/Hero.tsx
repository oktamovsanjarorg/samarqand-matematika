import type { MyStats, StudentWeeklyRow } from "@samarqand/shared";
import { uzToday } from "../../lib/time";

function weeklyText(w: StudentWeeklyRow | undefined): string {
  if (!w) return "—";
  if (w.status === "OPEN") return w.my.submitted ? "Topshirildi" : "Ochiq";
  if (w.status === "UPCOMING") return "Tez orada";
  return w.my.score === null ? "Yopildi" : `${w.my.score}/${w.questionCount}`;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2">
      <p className="truncate text-lg font-extrabold tabular-nums">{value}</p>
      <p className="truncate text-xs text-white/75">{label}</p>
    </div>
  );
}

/** Asosiy sahifa boshi (T-064): salom, bugungi sana va qisqa holat */
export function Hero(p: { name?: string; stats?: MyStats; weekly?: StudentWeeklyRow[] }) {
  const current = p.weekly?.find((t) => t.status === "OPEN") ?? p.weekly?.[0];
  return (
    <section className="space-y-4 rounded-card bg-brand p-4 text-white" data-testid="hero">
      <div className="flex items-center gap-3">
        <img src="/logo.jpg" alt="" className="h-12 w-12 rounded-xl bg-white p-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-white/75">{uzToday(new Date())}</p>
          <h1 className="truncate text-xl font-extrabold">Assalomu alaykum{p.name ? `, ${p.name}` : ""}!</h1>
        </div>
      </div>
      {p.stats && (
        <div className="flex gap-2">
          <Tile label="Testlar" value={String(p.stats.tests)} />
          <Tile
            label="Oʻrtacha"
            value={p.stats.averagePercent === null ? "—" : `${p.stats.averagePercent}%`}
          />
          <Tile label="Haftalik" value={weeklyText(current)} />
        </div>
      )}
    </section>
  );
}
