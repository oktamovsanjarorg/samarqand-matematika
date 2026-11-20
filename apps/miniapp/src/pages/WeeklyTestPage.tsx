import {
  ERROR_CODES,
  type WeeklyAttemptView,
  type WeeklyResult,
  type WeeklyWaiting,
} from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Clock, Hourglass } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Locked } from "../components/Locked";
import { ErrorState, TestSkeleton } from "../components/states";
import { ResultItem } from "../components/test/ResultItem";
import { Runner } from "../components/test/Runner";
import { useBackButton } from "../hooks/useBackButton";
import { ApiError, post } from "../lib/api";
import { formatStamp, timeLeft } from "../lib/time";
import { useWeeklySubmit, weeklyKey } from "../lib/weekly";

const backLink = "tap flex h-12 items-center justify-center rounded-xl border border-hint/25 font-semibold";

/** BR-W08: topshirilgan, oyna ochiq: na ball, na to'g'ri javob */
function Waiting({ v }: { v: WeeklyWaiting }) {
  return (
    <div className="space-y-4">
      <div className="card flex flex-col items-center gap-3 py-8 text-center" data-testid="waiting">
        <Hourglass size={32} className="text-brand" />
        <p className="font-bold">Test topshirildi</p>
        <p className="text-sm text-hint">
          Natija va toʻgʻri javoblar oyna yopilgach chiqadi: <b>{formatStamp(v.closesAt)}</b>. Bot xabar
          beradi.
        </p>
      </div>
      <Link to="/weekly" className={backLink}>
        Haftalik testlar
      </Link>
    </div>
  );
}

function Result({ r }: { r: WeeklyResult }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Natija</h1>
      <div className="card space-y-1 text-center" data-testid="score">
        <p className="text-sm text-hint">{r.title}</p>
        <p className="text-4xl font-extrabold text-brand">
          {r.score}/{r.total}
        </p>
        <p className="text-sm text-hint">{r.submittedAt ? "Ball" : "Test topshirilmagan: 0 ball"}</p>
      </div>
      <ol className="space-y-3">
        {r.items.map((item, i) => (
          <ResultItem key={item.question.id} item={item} n={i + 1} />
        ))}
      </ol>
      <Link to="/weekly" className={backLink}>
        Haftalik testlar
      </Link>
    </div>
  );
}

function Deadline({ closesAt }: { closesAt: string }) {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-brand/5 px-3 py-2 text-sm" data-testid="deadline">
      <Clock size={16} className="shrink-0 text-brand" />
      Yopilishiga {timeLeft(closesAt, new Date())} qoldi · bir marta topshiriladi
    </p>
  );
}

export function WeeklyTestPage() {
  const { id = "" } = useParams();
  useBackButton("/weekly");
  const submit = useWeeklySubmit(id);
  const q = useQuery({
    queryKey: weeklyKey(id),
    queryFn: () => post<WeeklyAttemptView>(`/weekly/${id}/attempts`),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const err = q.error;
  if (err instanceof ApiError && err.code === ERROR_CODES.LOCKED)
    return <Locked title="Haftalik test obuna bilan ochiladi" />;
  if (err) return <ErrorState message={err.message} onRetry={() => q.refetch()} />;
  if (!q.data) return <TestSkeleton />;
  const v = q.data;
  if (v.status === "WAITING") return <Waiting v={v} />;
  if (v.status === "RESULT") return <Result r={v} />;
  return (
    <Runner
      attempt={v}
      base="/weekly-attempts"
      kicker="Haftalik test"
      title={v.title}
      banner={<Deadline closesAt={v.closesAt} />}
      onSubmit={submit(v.id)}
    />
  );
}
