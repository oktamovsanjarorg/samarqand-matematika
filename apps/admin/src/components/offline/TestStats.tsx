import { formatQuestionList, type AdminOfflineTestDetail } from "@samarqand/shared";
import type { ReactNode } from "react";
import { fmtScore } from "../../lib/offline";

type T = AdminOfflineTestDetail;

export function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-bold">{title}</h2>
        {hint && <p className="text-xs text-hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold text-hint">{label}</p>
      <p className="text-xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="truncate text-xs text-hint">{hint}</p>}
    </div>
  );
}

/** Asosiy raqamlar: qatnashchi, o'rtacha ball, o'rtacha foiz, xabar holati */
export function Tiles({ t }: { t: T }) {
  const waiting = t.rows.filter((r) => r.userId && !r.notifiedAt).length;
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-testid="offline-tiles">
      <Tile label="Qatnashchi" value={String(t.count)} hint={`${t.matched} tasi oʻquvchiga moslangan`} />
      <Tile
        label="Oʻrtacha ball"
        value={t.avgScore === null ? "—" : fmtScore(t.avgScore)}
        hint={`${t.scaleMax} dan · darajali: ${t.rows.filter((r) => r.grade).length} ta`}
      />
      <Tile
        label="Oʻrtacha foiz"
        value={t.avgPercent === null ? "—" : `${fmtScore(t.avgPercent)}%`}
        hint={t.stats.median === null ? undefined : `mediana ${fmtScore(t.stats.median)}%`}
      />
      <Tile
        label="Xabar"
        value={t.notifiedAt ? "yuborilgan" : "yuborilmagan"}
        hint={waiting ? `${waiting} ta oʻquvchi kutmoqda` : undefined}
      />
    </div>
  );
}

/** Gorizontal ustunlar: soni yoki foiz */
export function Bars(p: {
  items: { label: string; value: number; suffix?: string }[];
  max?: number;
  warn?: boolean;
}) {
  const top = p.max ?? Math.max(1, ...p.items.map((i) => i.value));
  return (
    <ul className="space-y-1.5">
      {p.items.map((b) => (
        <li key={b.label} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 truncate text-hint">{b.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded bg-hint/10">
            <div
              className={`h-full rounded ${p.warn && b.value < 50 ? "bg-danger" : "bg-brand"}`}
              style={{ width: `${(b.value / top) * 100}%` }}
            />
          </div>
          <b className="w-20 text-right text-xs tabular-nums">
            {fmtScore(b.value)}
            {b.suffix ?? ""}
          </b>
        </li>
      ))}
    </ul>
  );
}

/** Fan bo'limlari bo'yicha o'rtacha to'g'ri javob ulushi */
export function SectionAverages({ t }: { t: T }) {
  return (
    <ul className="space-y-2 text-sm" data-testid="offline-sections">
      {t.stats.sections.map((s) => (
        <li key={s.title}>
          <div className="mb-1 flex justify-between gap-3">
            <span>
              {s.title} <span className="text-xs text-hint">({formatQuestionList(s.questions)})</span>
            </span>
            <b className="tabular-nums">{fmtScore(s.avgPercent)}%</b>
          </div>
          <div className="h-1.5 rounded-full bg-hint/10">
            <div
              className={`h-full rounded-full ${s.avgPercent < 50 ? "bg-danger" : "bg-brand"}`}
              style={{ width: `${s.avgPercent}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Hardest({ t }: { t: T }) {
  const hard = [...t.stats.questions].sort((a, b) => a.correctPct - b.correctPct).slice(0, 8);
  return (
    <Bars
      items={hard.map((x) => ({ label: `${x.q}-savol`, value: x.correctPct, suffix: "%" }))}
      max={100}
      warn
    />
  );
}

/** Har savol: to'g'ri yechganlar ulushi (qizil: yarmidan kam) */
export function QuestionGrid({ t }: { t: T }) {
  const tone = (p: number) =>
    p < 50 ? "bg-danger/10 text-danger" : p < 75 ? "bg-accent/10 text-accent" : "bg-success/10 text-success";
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5"
      data-testid="offline-questions"
    >
      {t.stats.questions.map((x) => (
        <div
          key={x.q}
          title={`${x.q}-savol: ${x.correctPct}% toʻgʻri, ${x.blankPct}% boʻsh`}
          className={`rounded-lg px-1 py-1.5 text-center text-xs ${tone(x.correctPct)}`}
        >
          <p className="text-[10px] opacity-70">{x.q}</p>
          <b>{Math.round(x.correctPct)}%</b>
        </div>
      ))}
    </div>
  );
}
