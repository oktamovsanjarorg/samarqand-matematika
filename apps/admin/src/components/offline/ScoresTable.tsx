import type { ReactNode } from "react";
import { fmtScore } from "../../lib/offline";

export interface ScoreRow {
  key: string;
  line: number;
  name: string;
  scores: number[];
  total: number;
}

/** Bo'limlar bo'yicha natija jadvali; oxirgi ustun: o'quvchi (moslash) */
export function ScoresTable<T extends ScoreRow>(p: {
  sections: string[];
  rows: T[];
  student: (r: T) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="offline-table">
        <thead className="text-left text-xs text-hint">
          <tr>
            <th className="py-2 pr-2">Qator</th>
            <th className="py-2 pr-2">Ism (fayldan)</th>
            <th className="py-2 pr-2">Oʻquvchi</th>
            {p.sections.map((s) => (
              <th key={s} className="py-2 pr-2 text-right">
                {s}
              </th>
            ))}
            <th className="py-2 pr-2 text-right">Jami</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hint/10">
          {p.rows.map((r) => (
            <tr key={r.key} data-testid="offline-row">
              <td className="py-2 pr-2 text-hint">{r.line}</td>
              <td className="py-2 pr-2 font-semibold">{r.name}</td>
              <td className="py-2 pr-2">{p.student(r)}</td>
              {r.scores.map((s, i) => (
                <td key={i} className="py-2 pr-2 text-right tabular-nums">
                  {fmtScore(s)}
                </td>
              ))}
              <td className="py-2 pr-2 text-right font-bold tabular-nums">{fmtScore(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
