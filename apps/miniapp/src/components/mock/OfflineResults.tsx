import type { StudentOfflineResult } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../store/auth";

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
const day = (d: string) => d.split("-").reverse().join(".");

function ResultCard({ r }: { r: StudentOfflineResult }) {
  return (
    <li>
      <Link to={`/offline/${r.id}`} className="tap card flex items-start gap-3" data-testid="offline-result">
        <FileSpreadsheet size={22} className="mt-0.5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{r.title}</p>
          <p className="text-xs text-hint">
            {day(r.date)} · {r.correct}/{r.questionCount} toʻgʻri · {r.place}-oʻrin, {r.participants} kishidan
          </p>
        </div>
        <div className="text-right">
          <b className="text-lg tabular-nums">{num(r.score)}</b>
          <p className="text-xs text-hint">
            {r.scaleMax} dan{r.grade ? ` · ${r.grade}` : ""}
          </p>
        </div>
      </Link>
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
