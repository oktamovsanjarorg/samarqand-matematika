import {
  ERROR_CODES,
  type WeeklyAttemptView,
  type WeeklyOpen,
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
import { TutorPanel } from "../components/tutor/TutorPanel";
import { RankingCard } from "../components/weekly/RankingCard";
import { PhotoThumb, SolutionPhotos } from "../components/weekly/SolutionPhotos";
import { useBackButton } from "../hooks/useBackButton";
import { ApiError, post } from "../lib/api";
import { usePhotos } from "../lib/photos";
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

/** Rasmlar va ustoz izohi; to'g'ri javob + rasm yo'q bo'lsa sarlavhaning o'zi aytadi */
function ItemExtras({ item, attemptId }: { item: WeeklyResult["items"][number]; attemptId: string }) {
  return (
    <>
      {item.noPhoto && item.result !== "CORRECT" && (
        <p className="text-sm font-semibold text-danger">Yechim rasmi yoʻq: 0 ball</p>
      )}
      {!item.noPhoto && (
        <div className="flex flex-wrap gap-2">
          {item.photos.map((id, k) => (
            <PhotoThumb key={id} id={id} n={k + 1} />
          ))}
        </div>
      )}
      {item.feedback && (
        <p className="rounded-xl bg-brand/5 p-3 text-sm" data-testid="feedback">
          <b>Ustoz izohi: </b>
          {item.feedback}
        </p>
      )}
      {item.result !== "CORRECT" && (
        <TutorPanel
          label="Xatoni tushuntir"
          input={{ mode: "REVIEW", attemptId, questionId: item.question.id }}
        />
      )}
    </>
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
      <RankingCard path={`/weekly/${r.weeklyTestId}/ranking`} heading="Reyting" />
      <ol className="space-y-3">
        {r.items.map((item, i) => (
          <ResultItem
            key={item.question.id}
            item={item}
            n={i + 1}
            zero={
              item.noPhoto && item.result === "CORRECT" && item.points === 0
                ? "Yechim rasmi yoʻq · 0 ball"
                : undefined
            }
          >
            <ItemExtras item={item} attemptId={r.id} />
          </ResultItem>
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

/** Yechish: har savol ostida yechim rasmi; rasmsiz savollar topshirishda eslatiladi (BR-W04) */
function WeeklyRunner({ v, testId }: { v: WeeklyOpen; testId: string }) {
  const submit = useWeeklySubmit(testId);
  const photos = usePhotos(v);
  return (
    <Runner
      attempt={v}
      base="/weekly-attempts"
      kicker="Haftalik test"
      title={v.title}
      banner={<Deadline closesAt={v.closesAt} />}
      extra={(qid) => <SolutionPhotos qid={qid} photos={photos} />}
      warning={
        photos.missing ? `Yechim rasmi yoʻq savollar: ${photos.missing} ta. Ular 0 ball boʻladi.` : undefined
      }
      onSubmit={submit(v.id)}
    />
  );
}

export function WeeklyTestPage() {
  const { id = "" } = useParams();
  useBackButton("/weekly");
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
  return <WeeklyRunner v={v} testId={id} />;
}
