import { parseExpression } from "@samarqand/math";
import type { Choice, QuestionView } from "@samarqand/shared";
import { Check } from "lucide-react";
import type { Response } from "../../lib/answers";
import { MathText } from "../MathText";

interface Props {
  question: QuestionView;
  value: unknown;
  onChange: (r: Response, immediate: boolean) => void;
}

const field = "w-full rounded-xl border border-hint/25 bg-section px-4 text-[15px]";
const get = <T,>(v: unknown, k: string): T | undefined =>
  typeof v === "object" && v !== null ? ((v as Record<string, T>)[k] ?? undefined) : undefined;

function ChoiceList(p: {
  options: Choice[];
  selected: string[];
  multiple: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <div className="space-y-2" role={p.multiple ? "group" : "radiogroup"}>
      {p.options.map((o) => {
        const on = p.selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            role={p.multiple ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => p.onPick(o.id)}
            className={`tap flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left ${
              on ? "border-brand bg-brand/5" : "border-hint/20 bg-section"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                on ? "bg-brand text-white" : "bg-hint/10"
              }`}
            >
              {on && p.multiple ? <Check size={16} /> : o.id.toUpperCase()}
            </span>
            <MathText text={o.text} className="flex-1 text-[15px]" />
          </button>
        );
      })}
    </div>
  );
}

function MatchingInput({ question, value, onChange }: Props) {
  const pairs = get<Record<string, string>>(value, "pairs") ?? {};
  return (
    <div className="space-y-3">
      <ol className="space-y-1 rounded-xl bg-hint/5 p-3 text-sm">
        {question.right?.map((r) => (
          <li key={r.id} className="flex gap-2">
            <b>{r.id}.</b> <MathText text={r.text} />
          </li>
        ))}
      </ol>
      {question.left?.map((l) => (
        <div key={l.id} className="space-y-1" data-testid="match-row">
          <div className="flex gap-2 text-[15px]">
            <b>{l.id.toUpperCase()})</b> <MathText text={l.text} />
          </div>
          <div className="flex flex-wrap gap-2">
            {question.right?.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-label={`${l.id.toUpperCase()} → ${r.id}`}
                aria-pressed={pairs[l.id] === r.id}
                onClick={() => onChange({ pairs: { ...pairs, [l.id]: r.id } }, true)}
                className={`tap h-11 min-w-11 rounded-xl border-2 font-bold ${
                  pairs[l.id] === r.id ? "border-brand bg-brand text-white" : "border-hint/20 bg-section"
                }`}
              >
                {r.id}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Ifoda: yozilgani formula ko'rinishida darhol chiqadi; tushunilmasa topshirishdan oldin aytiladi (T-077) */
function ExpressionInput({ value, onChange }: Props) {
  const text = get<string>(value, "value") ?? "";
  const parsed = text.trim() ? parseExpression(text) : null;
  return (
    <div className="space-y-2">
      <input
        value={text}
        onChange={(e) => onChange({ value: e.target.value }, false)}
        aria-label="Javob"
        placeholder="Masalan: 2(x+1) yoki x^2-1"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`${field} h-12`}
      />
      {text.trim() && (
        <div
          className="rounded-xl bg-surface px-4 py-2 text-sm"
          data-testid="expression-preview"
          aria-live="polite"
        >
          {parsed ? (
            <MathText text={"$" + parsed.tex + "$"} />
          ) : (
            <p className="text-danger">Ifoda tushunilmadi. Masalan: 2(x+1), x^2-1, sqrt(x)</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Savol turiga mos javob maydoni */
export function AnswerInput(props: Props) {
  const { question: q, value, onChange } = props;
  switch (q.type) {
    case "SINGLE": {
      const id = get<string>(value, "optionId");
      return (
        <ChoiceList
          options={q.options ?? []}
          selected={id ? [id] : []}
          multiple={false}
          onPick={(optionId) => onChange({ optionId }, true)}
        />
      );
    }
    case "MULTIPLE": {
      const ids = get<string[]>(value, "optionIds") ?? [];
      const pick = (id: string) =>
        onChange({ optionIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] }, true);
      return <ChoiceList options={q.options ?? []} selected={ids} multiple onPick={pick} />;
    }
    case "MATCHING":
      return <MatchingInput {...props} />;
    case "WRITTEN":
      return (
        <textarea
          value={get<string>(value, "text") ?? ""}
          onChange={(e) => onChange({ text: e.target.value }, false)}
          rows={6}
          aria-label="Yechim"
          placeholder="Yechimingizni yozing"
          className={`${field} py-3`}
        />
      );
    case "EXPRESSION":
      return <ExpressionInput {...props} />;
    default:
      return (
        <input
          value={get<string>(value, "value") ?? ""}
          onChange={(e) => onChange({ value: e.target.value }, false)}
          aria-label="Javob"
          placeholder="Masalan: 3/4 yoki 0,75"
          autoComplete="off"
          className={`${field} h-12`}
        />
      );
  }
}
