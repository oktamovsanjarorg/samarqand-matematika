import {
  questionPoints,
  sectionScores,
  weakestSection,
  type AdminOfflineResultRow,
  type AdminOfflineTestDetail,
} from "@samarqand/shared";
import { fmtScore } from "../../lib/offline";

const CELL = {
  c: "bg-success/10 text-success",
  w: "bg-danger/10 text-danger",
  b: "bg-hint/10 text-hint",
} as const;
const cell = (a: string) => CELL[a === "c" || a === "w" ? a : "b"];

/** Natija kartasi: ball, daraja, fan bo'limlari (bo'lim bali), eng zaif bo'lim, har savol */
export function ResultCard({ t, r }: { t: AdminOfflineTestDetail; r: AdminOfflineResultRow }) {
  const w = t.rasch.items.map((i) => i.w);
  const secs = sectionScores(t.sections, r.answers, r.score, w);
  const pts = questionPoints(r.answers, r.score, w);
  const weak = weakestSection(secs);
  const wrong = [...r.answers].flatMap((x, j) => (x === "c" ? [] : [j + 1]));
  return (
    <div className="space-y-3 rounded-xl bg-hint/5 p-3 text-sm" data-testid="offline-card">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-section p-2">
          <p className="text-xs text-hint">Ball</p>
          <p className="text-lg font-extrabold">{`${fmtScore(r.score)}/${t.scaleMax}`}</p>
        </div>
        <div className="rounded-lg bg-section p-2">
          <p className="text-xs text-hint">Foiz</p>
          <p className="text-lg font-extrabold">{fmtScore(r.percent)}%</p>
        </div>
        <div className="rounded-lg bg-section p-2">
          <p className="text-xs text-hint">Daraja</p>
          <p className="text-lg font-extrabold">{r.grade ?? "—"}</p>
        </div>
      </div>
      {secs.length > 0 && (
        <ul className="divide-y divide-hint/10">
          {secs.map((s) => (
            <li key={s.title} className="flex justify-between gap-3 py-1.5">
              <span className="text-hint">{`${s.title} · ${s.correct}/${s.max}`}</span>
              <b className="tabular-nums">{fmtScore(s.points)}</b>
            </li>
          ))}
        </ul>
      )}
      {weak && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-danger">
          Eng zaif boʻlim: <b>{weak.title}</b> · {weak.correct}/{weak.max} ({fmtScore(weak.percent)}%)
        </p>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1">
        {[...r.answers].map((a, j) => (
          <div key={j} className={`rounded px-1 py-1 text-center ${cell(a)}`}>
            <p className="text-[10px] opacity-70">{j + 1}</p>
            <p className="text-[11px] font-bold tabular-nums">
              {a === "c" ? fmtScore(pts[j] ?? 0) : a === "w" ? "✕" : "–"}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-hint">
        Xato yoki boʻsh ({wrong.length} ta): {wrong.join(", ") || "yoʻq"}
      </p>
    </div>
  );
}
