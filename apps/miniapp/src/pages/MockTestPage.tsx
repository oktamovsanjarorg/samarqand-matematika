import { ERROR_CODES, type MockAttemptView, type MockOpen, type MockWaiting } from "@samarqand/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Hourglass } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Locked } from "../components/Locked";
import { Countdown } from "../components/mock/Countdown";
import { MockResultView } from "../components/mock/MockResultView";
import { ErrorState, TestSkeleton } from "../components/states";
import { Runner } from "../components/test/Runner";
import { useBackButton } from "../hooks/useBackButton";
import { ApiError, post } from "../lib/api";
import { mockKey, useMockSubmit } from "../lib/mock";
import { formatStamp } from "../lib/time";

/** Topshirilgan yoki vaqt tugagan, oyna ochiq: natija yo'q (BR-M06) */
function Waiting({ v }: { v: MockWaiting }) {
  return (
    <div className="space-y-4">
      <div className="card flex flex-col items-center gap-3 py-8 text-center" data-testid="waiting">
        <Hourglass size={32} className="text-brand" />
        <p className="font-bold">Mock topshirildi</p>
        <p className="text-sm text-hint">
          Natija va toʻgʻri javoblar oyna yopilgach chiqadi: <b>{formatStamp(v.closesAt)}</b>
        </p>
      </div>
      <Link
        to="/mocks"
        className="tap flex h-12 items-center justify-center rounded-xl border border-hint/25 font-semibold"
      >
        Mocklar
      </Link>
    </div>
  );
}

function MockRunner({ v, mockId }: { v: MockOpen; mockId: string }) {
  const qc = useQueryClient();
  const submit = useMockSubmit(mockId);
  return (
    <Runner
      attempt={v}
      base="/mock-attempts"
      kicker="Mock"
      title={v.title}
      banner={
        <Countdown
          deadline={v.deadline}
          onExpire={() => void qc.invalidateQueries({ queryKey: mockKey(mockId) })}
        />
      }
      extra={(qid) => {
        const q = v.questions.find((x) => x.question.id === qid);
        const s = q && v.sections[q.section];
        return s && <p className="text-xs text-hint">{`${s.title} · ${s.points} ball`}</p>;
      }}
      onSubmit={submit(v.id)}
    />
  );
}

/** Mock: yechish (AI o'chiq), kutish yoki natija */
export function MockTestPage() {
  const { id = "" } = useParams();
  useBackButton("/mocks");
  const q = useQuery({
    queryKey: mockKey(id),
    queryFn: () => post<MockAttemptView>(`/mocks/${id}/attempts`),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const err = q.error;
  if (err instanceof ApiError && err.code === ERROR_CODES.LOCKED)
    return <Locked title="Mock obuna bilan ochiladi" />;
  if (err) return <ErrorState message={err.message} onRetry={() => q.refetch()} />;
  if (!q.data) return <TestSkeleton />;
  const v = q.data;
  if (v.status === "WAITING") return <Waiting v={v} />;
  if (v.status === "RESULT") return <MockResultView r={v} />;
  return <MockRunner v={v} mockId={id} />;
}
