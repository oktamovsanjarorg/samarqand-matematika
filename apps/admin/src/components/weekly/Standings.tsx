import type { WeeklyStanding } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/labels";

/** Natijalar: ustoz oyna ochiq paytda ham ko'radi (o'quvchi faqat yopilgach) */
export function Standings({ id, total }: { id: string; total: number }) {
  const rows = useQuery({
    queryKey: ["standings", id],
    queryFn: () => api.get<WeeklyStanding[]>(`/admin/weekly/${id}/standings`),
  });
  return (
    <section className="card space-y-2" data-testid="standings">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Natijalar</h2>
        <Link to={`/weekly/${id}/review`} className="text-sm font-semibold text-link">
          Tekshirish navbati
        </Link>
      </div>
      {rows.data?.length === 0 && <p className="text-sm text-hint">Hali hech kim boshlamagan</p>}
      <ol className="divide-y divide-hint/10">
        {rows.data?.map((r, i) => (
          <li key={r.userId} className="flex items-center gap-3 py-2 text-sm">
            <span className="w-6 font-bold text-hint">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
            <span className="text-xs text-hint">
              {r.submittedAt ? formatDate(r.submittedAt) : "topshirmagan"}
            </span>
            <span className="w-12 text-right font-bold text-brand">
              {r.score}/{total}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
