import type { AdminOfflineTestDetail } from "@samarqand/shared";
import { useState } from "react";
import { fmtScore } from "../../lib/offline";

/** Qiyinlik: markaz 0, chapga oson (yashil), o'ngga qiyin (qizil) */
function Difficulty({ b, maxAbs }: { b: number; maxAbs: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-24 rounded bg-hint/10">
        <span
          className={`absolute inset-y-0 rounded ${b > 0 ? "left-1/2 bg-danger" : "right-1/2 bg-success"}`}
          style={{ width: `${(Math.abs(b) / maxAbs) * 50}%` }}
        />
      </div>
      <span className="w-12 text-xs tabular-nums text-hint">
        {b > 0 ? "+" : ""}
        {b.toFixed(2).replace(".", ",")}
      </span>
    </div>
  );
}

/** Rasch tahlili: har savol qiyinligi (logit) va ballga ta'siri (og'irlik) */
export function RaschTable({ t }: { t: AdminOfflineTestDetail }) {
  const [hardFirst, setHardFirst] = useState(false);
  const r = t.rasch;
  const items = hardFirst ? [...r.items].sort((a, b) => b.b - a.b) : r.items;
  const maxAbs = Math.max(1, ...r.items.map((i) => Math.abs(i.b)));
  const section = (q: number) => t.sections.find((s) => s.questions.includes(q))?.title ?? "";
  return (
    <div className="space-y-2">
      <p className="text-xs text-hint">
        {r.calibrated
          ? `Savollar qiyinligi shu ${r.n} ta natijadan hisoblandi: kam yechilgan savol qiyin va ballga koʻproq taʼsir qiladi.`
          : `Qatnashchi ${r.n} ta: qiyinlikni hisoblash uchun kamida 30 ta kerak, shuning uchun hamma savol teng (ogʻirlik 1).`}
      </p>
      <button
        type="button"
        className="text-sm font-semibold text-link"
        onClick={() => setHardFirst(!hardFirst)}
      >
        {hardFirst ? "Tartib boʻyicha" : "Eng qiyini avval"}
      </button>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-section text-left text-xs text-hint">
            <tr>
              <th className="py-1 pr-2">Savol</th>
              <th className="hidden py-1 pr-2 md:table-cell">Boʻlim</th>
              <th className="py-1 pr-2 text-right">Toʻgʻri</th>
              <th className="py-1 pr-2">Qiyinlik</th>
              <th className="py-1 text-right">Ogʻirlik</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hint/10">
            {items.map((i) => (
              <tr key={i.q}>
                <td className="py-1.5 pr-2 font-semibold">{i.q}</td>
                <td className="hidden max-w-48 truncate py-1.5 pr-2 text-hint md:table-cell">
                  {section(i.q)}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{fmtScore(i.correctPct)}%</td>
                <td className="py-1.5 pr-2">
                  <Difficulty b={i.b} maxAbs={maxAbs} />
                </td>
                <td className="py-1.5 text-right tabular-nums">{i.w.toFixed(2).replace(".", ",")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
