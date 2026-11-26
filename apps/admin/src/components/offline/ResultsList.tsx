import type { AdminOfflineTestDetail } from "@samarqand/shared";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { fmtScore } from "../../lib/offline";
import { Badge } from "../ui";
import { AssignStudent } from "./AssignStudent";
import { ResultCard } from "./ResultCard";

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’‘]/g, "");

function Filters(p: {
  t: AdminOfflineTestDetail;
  q: string;
  setQ: (v: string) => void;
  unmatched: boolean;
  setUnmatched: (v: boolean) => void;
}) {
  const { t, q, setQ, unmatched, setUnmatched } = p;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ism boʻyicha qidirish"
        aria-label="Natijalardan qidirish"
        className="min-h-10 flex-1 rounded-xl border border-hint/25 bg-section px-3 text-sm"
      />
      {t.count > t.matched && (
        <button
          type="button"
          aria-pressed={unmatched}
          onClick={() => setUnmatched(!unmatched)}
          className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${unmatched ? "bg-danger/10 text-danger" : "bg-section text-hint"}`}
        >
          Moslanmaganlar ({t.count - t.matched})
        </button>
      )}
    </div>
  );
}

/** Natijalar: o'rin, ism, to'g'ri/xato/bo'sh, ball, daraja; qatorni bosganda natija kartasi */
export function ResultsList({ t }: { t: AdminOfflineTestDetail }) {
  const [open, setOpen] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState(false);
  const [q, setQ] = useState("");
  const rows = t.rows
    .filter((r) => !unmatched || !r.userId)
    .filter((r) => !q.trim() || norm(`${r.name} ${r.userName ?? ""}`).includes(norm(q.trim())));
  return (
    <div className="space-y-3">
      <Filters t={t} q={q} setQ={setQ} unmatched={unmatched} setUnmatched={setUnmatched} />
      {!rows.length && <p className="text-sm text-hint">Topilmadi</p>}
      <ul className="divide-y divide-hint/10">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2 py-2.5" data-testid="offline-row">
            <div className="flex items-center gap-2">
              <span className="w-7 shrink-0 text-center font-extrabold text-hint">{r.rank}</span>
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                aria-expanded={open === r.id}
                onClick={() => setOpen(open === r.id ? null : r.id)}
              >
                <p className="truncate font-semibold">{r.name}</p>
                <p className="text-xs text-hint">
                  {r.correct} toʻgʻri · {r.wrong} xato · {r.blank} boʻsh · {fmtScore(r.percent)}%
                </p>
              </button>
              <div className="text-right">
                <p className="font-bold tabular-nums text-brand">{fmtScore(r.score)}</p>
                {r.grade && <Badge tone="success">{r.grade}</Badge>}
              </div>
              <ChevronDown size={16} className={`shrink-0 text-hint ${open === r.id ? "rotate-180" : ""}`} />
            </div>
            <div className="pl-9">
              <AssignStudent testId={t.id} resultId={r.id} userName={r.userName} rowName={r.name} />
            </div>
            {open === r.id && <ResultCard t={t} r={r} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
