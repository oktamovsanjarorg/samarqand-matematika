import type { OfflineRankingRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { fmtScore } from "../../lib/offline";
import { EmptyState, ErrorState, SkeletonList } from "../ui";

const PERIODS = [
  { days: 30, label: "30 kun" },
  { days: 90, label: "90 kun" },
  { days: 365, label: "1 yil" },
  { days: 0, label: "Hammasi" },
] as const;

/** Offline testlar bo'yicha reyting: o'rtacha ball, testlar soni, eng yaxshi va oxirgi natija */
export function OfflineRanking() {
  const [days, setDays] = useState<number>(90);
  const q = useQuery({
    queryKey: ["offline", "ranking", days],
    queryFn: () => api.get<OfflineRankingRow[]>(`/admin/offline-tests/ranking?days=${days}`),
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            aria-pressed={days === p.days}
            onClick={() => setDays(p.days)}
            className={`min-h-9 rounded-full px-3 text-sm font-semibold ${days === p.days ? "bg-brand text-white" : "bg-section text-hint"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {q.isPending && <SkeletonList rows={4} />}
      {q.isError && <ErrorState message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data?.length === 0 && (
        <EmptyState title="Reyting uchun natija yoʻq" hint="Moslangan natijalar kerak" />
      )}
      {!!q.data?.length && (
        <ol className="card divide-y divide-hint/10" data-testid="offline-ranking">
          {q.data.map((r, i) => (
            <li key={r.userId}>
              <Link to={`/students/${r.userId}`} className="tap flex items-center gap-3 py-2.5">
                <span className="w-7 text-center font-extrabold text-hint">
                  {i < 3 ? <Trophy size={16} className="mx-auto text-accent" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="text-xs text-hint">
                    {r.groupName ?? "guruhsiz"} · {r.tests} ta test · eng yaxshisi {fmtScore(r.best)} ·
                    oxirgisi {fmtScore(r.last)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums text-brand">{fmtScore(r.avgScore)}</p>
                  <p className="text-xs text-hint">{fmtScore(r.avgPercent)}%</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
