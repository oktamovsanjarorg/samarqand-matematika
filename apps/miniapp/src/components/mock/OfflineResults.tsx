import type { StudentOfflineResult } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../store/auth";

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
const day = (d: string) => d.split("-").reverse().join(".");

function ResultCard({ r }: { r: StudentOfflineResult }) {
  return (
    <li className="card space-y-2" data-testid="offline-result">
      <div className="flex items-start gap-3">
        <FileSpreadsheet size={22} className="mt-0.5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{r.title}</p>
          <p className="text-xs text-hint">
            {day(r.date)} · {r.place}-oʻrin, {r.participants} kishidan
          </p>
        </div>
        <b className="text-lg tabular-nums">{num(r.total)}</b>
      </div>
      <ul className="divide-y divide-hint/10">
        {r.sections.map((s, i) => (
          <li key={s} className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-hint">{s}</span>
            <b className="tabular-nums">{num(r.scores[i] ?? 0)}</b>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Offline (qog'ozda) yozilgan test natijalari: ustoz yuklagan, bo'limlar bo'yicha (T-056c) */
export function OfflineResults() {
  const isStudent = useAuth((s) => s.user?.role === "STUDENT");
  const list = useQuery({
    queryKey: ["offline-results"],
    queryFn: () => api<StudentOfflineResult[]>("/me/offline-results"),
    enabled: isStudent,
  });
  if (!list.data?.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-bold">Offline testlar</h2>
      <ul className="space-y-2">
        {list.data.map((r) => (
          <ResultCard key={r.id} r={r} />
        ))}
      </ul>
    </section>
  );
}
