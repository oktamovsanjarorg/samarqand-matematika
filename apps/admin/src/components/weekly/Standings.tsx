import type { WeeklyStanding } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { csvTime, downloadExcel } from "../../lib/download";
import { formatDate } from "../../lib/labels";
import { ExportButton } from "../ExportButton";

/** Natijalar: ustoz oyna ochiq paytda ham ko'radi (o'quvchi faqat yopilgach) */
export function Standings({ id, total, title }: { id: string; total: number; title: string }) {
  const rows = useQuery({
    queryKey: ["standings", id],
    queryFn: () => api.get<WeeklyStanding[]>(`/admin/weekly/${id}/standings`),
  });
  const exportCsv = () =>
    downloadExcel(title, [
      ["#", "Oʻquvchi", "Topshirgan", "Toʻgʻri javob", "Ball", "Savollar"],
      ...(rows.data ?? []).map((r, i) => [
        i + 1,
        r.name,
        csvTime(r.submittedAt) ?? "topshirmagan",
        r.correct,
        r.score,
        total,
      ]),
    ]);
  return (
    <section className="card space-y-2" data-testid="standings">
      <div className="flex items-center justify-between">
        <h2 className="min-w-0 flex-1 font-bold">Natijalar</h2>
        {!!rows.data?.length && <ExportButton onClick={exportCsv} />}
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
