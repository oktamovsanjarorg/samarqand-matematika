import type { ReactNode } from "react";
import { fmtScore } from "../../lib/offline";

export interface ScoreRow {
  key: string;
  line: number;
  name: string;
  correct: number;
  percent: number;
  score: number;
  grade: string | null;
}

/** Natija jadvali: to'g'ri javoblar, foiz, ball va daraja; o'quvchi ustuni moslash uchun */
export function ScoresTable<T extends ScoreRow>(p: { rows: T[]; student: (r: T) => ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="offline-table">
        <thead className="text-left text-xs text-hint">
          <tr>
            <th className="py-2 pr-2">Qator</th>
            <th className="py-2 pr-2">Ism (fayldan)</th>
            <th className="py-2 pr-2">Oʻquvchi</th>
            <th className="py-2 pr-2 text-right">Toʻgʻri</th>
            <th className="py-2 pr-2 text-right">Foiz</th>
            <th className="py-2 pr-2 text-right">Ball</th>
            <th className="py-2 pr-2 text-right">Daraja</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hint/10">
          {p.rows.map((r) => (
            <tr key={r.key} data-testid="offline-row">
              <td className="py-2 pr-2 text-hint">{r.line}</td>
              <td className="py-2 pr-2 font-semibold">{r.name}</td>
              <td className="py-2 pr-2">{p.student(r)}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{r.correct}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{fmtScore(r.percent)}%</td>
              <td className="py-2 pr-2 text-right font-bold tabular-nums">{fmtScore(r.score)}</td>
              <td className="py-2 pr-2 text-right">{r.grade ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
