import { useMutation } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { isAnswered } from "../../lib/answers";
import { useAwayTracker } from "../../lib/away";
import { useAnswers, type Answerable } from "../../lib/attempt";
import { MathText } from "../MathText";
import { AnswerInput } from "./AnswerInput";
import { Progress } from "./Progress";
import { SubmitPanel } from "./SubmitPanel";

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

export interface RunnerProps {
  attempt: Answerable;
  /** Javob saqlash yo'li: "/attempts" yoki "/weekly-attempts" */
  base: string;
  kicker: string;
  title: string;
  banner?: ReactNode;
  /** Savol ostidagi qo'shimcha (haftalik testda yechim rasmi) */
  extra?: (questionId: string, flush: () => Promise<void>) => ReactNode;
  /** Topshirishdan oldin qo'shimcha ogohlantirish */
  warning?: string;
  /** T-193: ilovadan chiqish ustozga signal bo'ladi (haftalik va mock; mavzu testida yo'q) */
  trackAway?: boolean;
  /** Topshirish: flush() dan keyin serverga yuboradi va keyingi ekranga o'tadi */
  onSubmit: (flush: () => Promise<void>) => Promise<void>;
}

/** Savollarni birma-bir yechish: mavzu testi va haftalik test uchun umumiy */
export function Runner(p: RunnerProps) {
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const answers = useAnswers(p.attempt, p.base);
  useAwayTracker(p.trackAway ? `${p.base}/${p.attempt.id}/away` : null);
  const submit = useMutation({ mutationFn: () => p.onSubmit(answers.flush) });
  const items = p.attempt.questions;
  const current = items[index]?.question;
  const answered = items.map((x) => isAnswered(x.question, answers.values[x.question.id]));
  const last = index === items.length - 1;
  if (!current) return null;
  // Boshqa savolga o'tishda yozilayotgan javob darhol saqlanadi
  const go = (i: number) => {
    void answers.flush().catch(() => undefined);
    setIndex(i);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-hint">
          {p.kicker} · {index + 1}/{items.length}
        </p>
        <h1 className="text-lg font-extrabold">{p.title}</h1>
      </div>
      {p.banner}
      <Progress total={items.length} current={index} answered={answered} onJump={go} />
      <section className="card space-y-4" data-testid="question">
        <MathText text={current.text} className="text-[16px] leading-relaxed" />
        <AnswerInput
          question={current}
          value={answers.values[current.id]}
          onChange={(r, now) => answers.set(current.id, r, now)}
        />
        {p.extra?.(current.id, answers.flush)}
      </section>
      {answers.failed && (
        <p className="text-sm text-danger" role="alert">
          Javob saqlanmadi. Internet qaytishi bilan oʻzi qayta yuboriladi.
        </p>
      )}
      {confirming ? (
        <SubmitPanel
          unanswered={answered.filter((a) => !a).length}
          warning={p.warning}
          busy={submit.isPending}
          error={submit.error?.message}
          onSubmit={() => submit.mutate()}
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
