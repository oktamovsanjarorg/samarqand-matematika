import { ERROR_CODES, type AttemptView } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Locked } from "../components/Locked";
import { MathText } from "../components/MathText";
import { ErrorState } from "../components/states";
import { AnswerInput } from "../components/test/AnswerInput";
import { Progress } from "../components/test/Progress";
import { SubmitPanel } from "../components/test/SubmitPanel";
import { useBackButton } from "../hooks/useBackButton";
import { isAnswered } from "../lib/answers";
import { ApiError, post } from "../lib/api";
import { useAnswers, useSubmit } from "../lib/attempt";

const navBtn = "tap h-12 flex-1 rounded-xl font-semibold disabled:opacity-40";

function Nav(p: { first: boolean; last: boolean; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={p.first}
        onClick={p.onPrev}
        className={`${navBtn} border border-hint/25`}
      >
        Oldingi
      </button>
      <button type="button" onClick={p.onNext} className={`${navBtn} bg-brand text-white`}>
        {p.last ? "Yakunlash" : "Keyingi"}
      </button>
    </div>
  );
}

function Runner({ attempt }: { attempt: AttemptView }) {
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const answers = useAnswers(attempt);
  const submit = useSubmit(attempt.id, answers.flush);
  const navigate = useNavigate();
  const items = attempt.questions;
  const current = items[index]?.question;
  const answered = items.map((x) => isAnswered(x.question, answers.values[x.question.id]));
  const last = index === items.length - 1;
  if (!current) return null;
  // Boshqa savolga o'tishda yozilayotgan javob darhol saqlanadi
  const go = (i: number) => {
    void answers.flush().catch(() => undefined);
    setIndex(i);
  };
  const send = () =>
    submit.mutate(undefined, { onSuccess: (r) => navigate(`/attempts/${r.id}`, { replace: true }) });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-hint">
          Mavzu testi · {index + 1}/{items.length}
        </p>
        <h1 className="text-lg font-extrabold">{attempt.topicTitle}</h1>
      </div>
      <Progress total={items.length} current={index} answered={answered} onJump={go} />
      <section className="card space-y-4" data-testid="question">
        <MathText text={current.text} className="text-[16px] leading-relaxed" />
        <AnswerInput
          question={current}
          value={answers.values[current.id]}
          onChange={(r, now) => answers.set(current.id, r, now)}
        />
      </section>
      {answers.failed && (
        <p className="text-sm text-danger" role="alert">
          Javob saqlanmadi. Internetni tekshiring.
        </p>
      )}
      {confirming ? (
        <SubmitPanel
          unanswered={answered.filter((a) => !a).length}
          busy={submit.isPending}
          error={submit.error?.message}
          onSubmit={send}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <Nav
          first={index === 0}
          last={last}
          onPrev={() => go(index - 1)}
          onNext={() => (last ? setConfirming(true) : go(index + 1))}
        />
      )}
    </div>
  );
}

export function TopicTestPage() {
  const { id = "" } = useParams();
  useBackButton("/lessons");
  // Ochiq urinish bo'lsa server shuni qaytaradi: test qayta ochilganda javoblar saqlanib qoladi
  const attempt = useQuery({
    queryKey: ["topic-test", id],
    queryFn: () => post<AttemptView>(`/topics/${id}/attempts`),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const err = attempt.error;
  if (err instanceof ApiError && err.code === ERROR_CODES.LOCKED)
    return <Locked title="Mavzu testi obuna bilan ochiladi" />;
  if (err) return <ErrorState message={err.message} onRetry={() => attempt.refetch()} />;
  if (!attempt.data)
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-48" />
      </div>
    );
  return <Runner attempt={attempt.data} />;
}
