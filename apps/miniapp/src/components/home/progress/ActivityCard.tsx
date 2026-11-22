import type { MyProgress } from "@samarqand/shared";
import { Flame } from "lucide-react";

const WEEKDAY = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
const weekday = (date: string) => WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? "";

function streakHint(s: MyProgress["streak"]): string {
  if (s.activeToday) return "Bugun shugʻullandingiz. Ertaga ham davom eting!";
  if (s.current > 0) return "Bugun ham bitta test ishlang: seriya uzilmasin";
  return "Bugun test ishlang va seriyani boshlang";
}

/** 7 kunlik faollik: har kuni javob berilgan savollar; bugungi ustun brend rangida */
function WeekBars({ week }: { week: MyProgress["week"] }) {
  const max = Math.max(1, ...week.map((d) => d.answers));
  return (
    <ol className="flex h-28 items-end gap-1.5" aria-label="Oxirgi 7 kun">
      {week.map((d, i) => {
        const today = i === week.length - 1;
        const h = d.answers ? Math.max(8, Math.round((d.answers / max) * 100)) : 4;
        return (
          <li key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold tabular-nums text-hint">{d.answers || ""}</span>
            <span
              className={`w-full rounded-md ${d.answers ? (today ? "bg-brand" : "bg-brand/40") : "bg-hint/20"}`}
              style={{ height: `${h}%` }}
              aria-hidden
            />
            <span className={`text-xs ${today ? "font-bold text-brand" : "text-hint"}`}>
              {weekday(d.date)}
              <span className="sr-only">: {d.answers} ta javob</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Faollik seriyasi va 7 kunlik grafik (T-169) */
export function ActivityCard({ p }: { p: MyProgress }) {
  const total = p.week.reduce((s, d) => s + d.answers, 0);
  return (
    <section className="card space-y-4" data-testid="activity">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
            p.streak.current ? "bg-accent/15 text-accent" : "bg-hint/10 text-hint"
          }`}
        >
          <Flame size={30} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-extrabold tabular-nums" data-testid="streak">
            {p.streak.current} kun
            <span className="ml-1 text-base font-bold text-hint">ketma-ket</span>
          </p>
          <p className="text-sm text-hint">{streakHint(p.streak)}</p>
        </div>
      </div>
      <WeekBars week={p.week} />
      <p className="flex justify-between text-sm text-hint">
        <span>
          7 kunda: <b className="text-text">{total}</b> ta javob
        </span>
        <span>
          Eng uzun seriya: <b className="text-text">{p.streak.best}</b> kun
        </span>
      </p>
    </section>
  );
}
