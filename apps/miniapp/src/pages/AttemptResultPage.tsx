import type { AttemptResult, AttemptView } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { ErrorState } from "../components/states";
import { ResultItem } from "../components/test/ResultItem";
import { useBackButton } from "../hooks/useBackButton";
import { api } from "../lib/api";

function Score({ r }: { r: AttemptResult }) {
  const manual = r.total - r.checkable;
  const percent = r.checkable ? Math.round((r.correct / r.checkable) * 100) : 0;
  return (
    <div className="card space-y-1 text-center" data-testid="score">
      <p className="text-sm text-hint">{r.topicTitle}</p>
      {r.checkable > 0 && (
        <>
          <p className="text-4xl font-extrabold text-brand">
            {r.correct}/{r.checkable}
          </p>
          <p className="text-sm text-hint">Toʻgʻri javoblar · {percent}%</p>
        </>
      )}
      {manual > 0 && <p className="text-sm text-hint">Ustoz tekshiradi: {manual} ta savol</p>}
    </div>
  );
}

export function AttemptResultPage() {
  const { id = "" } = useParams();
  useBackButton("/lessons");
  const q = useQuery({
    queryKey: ["attempt", id],
    queryFn: () => api<AttemptView | AttemptResult>(`/attempts/${id}`),
  });
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  if (!q.data) return <div className="skeleton h-40" aria-busy="true" />;
  const r = q.data;
  if (r.status === "OPEN") return <Navigate to={`/topics/${r.topicId}/test`} replace />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Natija</h1>
      <Score r={r} />
      <ol className="space-y-3">
        {r.items.map((item, i) => (
          <ResultItem key={item.question.id} item={item} n={i + 1} />
        ))}
      </ol>
      <div className="flex gap-2">
        <Link
          to="/lessons"
          className="tap flex h-12 flex-1 items-center justify-center rounded-xl border border-hint/25 font-semibold"
        >
          Darslar
        </Link>
        <Link
          to={`/topics/${r.topicId}/test`}
          className="tap flex h-12 flex-1 items-center justify-center rounded-xl bg-brand font-bold text-white"
        >
          Qayta ishlash
        </Link>
      </div>
    </div>
  );
}
