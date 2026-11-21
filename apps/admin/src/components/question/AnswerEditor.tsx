import { parseExpression } from "@samarqand/math";
import type { QuestionInput } from "@samarqand/shared";
import { MatchingEditor } from "./MatchingEditor";
import { OptionsEditor } from "./OptionsEditor";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

type Numeric = Extract<QuestionInput, { type: "NUMERIC" }>;
type Expression = Extract<QuestionInput, { type: "EXPRESSION" }>;

/** Ifoda: brauzerda o'qilishi darhol ko'rinadi; shakl muhim bo'lsa ustoz o'zi tekshiradi (T-074) */
function ExpressionFields({ q, onChange }: { q: Expression; onChange: (q: QuestionInput) => void }) {
  const manual = q.answer.manual === true;
  const ok = !q.answer.value.trim() || parseExpression(q.answer.value) !== null;
  return (
    <div className="space-y-2">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-hint">
          {"Toʻgʻri ifoda (2(x+1), x^2-1, \\frac{x}{2})"}
        </span>
        <input
          value={q.answer.value}
          onChange={(e) => onChange({ ...q, answer: { ...q.answer, value: e.target.value } })}
          aria-label="Toʻgʻri ifoda"
          className={field}
        />
      </label>
      {!manual && (
        <p className={`text-xs ${ok ? "text-hint" : "text-danger"}`} data-testid="expression-status">
          {ok
            ? "Teng ifodalar toʻgʻri hisoblanadi: 2(x+1) va 2x+2 bir xil"
            : "Ifoda oʻqilmadi: tekshirib boʻlmaydi"}
        </p>
      )}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={manual}
          onChange={(e) =>
            onChange({
              ...q,
              answer: { value: q.answer.value, ...(e.target.checked ? { manual: true } : {}) },
            })
          }
        />
        Ustoz tekshiradi (shakl muhim: masalan koʻpaytuvchilarga ajratish)
      </label>
    </div>
  );
}

function NumericFields({ q, onChange }: { q: Numeric; onChange: (q: QuestionInput) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-semibold text-hint">{"Toʻgʻri javob (3/4, 0,75, \\frac{3}{4})"}</span>
        <input
          value={q.answer.value}
          onChange={(e) => onChange({ ...q, answer: { ...q.answer, value: e.target.value } })}
          aria-label="Toʻgʻri javob"
          className={field}
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-semibold text-hint">Ruxsat etilgan xato (ixtiyoriy)</span>
        <input
          value={q.answer.tolerance ?? ""}
          onChange={(e) =>
            onChange({
              ...q,
              answer: { value: q.answer.value, ...(e.target.value ? { tolerance: e.target.value } : {}) },
            })
          }
          placeholder="0,01"
          aria-label="Ruxsat etilgan xato"
          className={field}
        />
      </label>
    </div>
  );
}

/** Savol turiga xos qism: variantlar, son, ifoda yoki juftlar */
export function AnswerEditor({ q, onChange }: { q: QuestionInput; onChange: (q: QuestionInput) => void }) {
  switch (q.type) {
    case "SINGLE":
      return (
        <OptionsEditor
          options={q.options}
          correct={[q.answer.optionId]}
          multiple={false}
          onChange={(options, c) => onChange({ ...q, options, answer: { optionId: c[0] ?? "a" } })}
        />
      );
    case "MULTIPLE":
      return (
        <OptionsEditor
          options={q.options}
          correct={q.answer.optionIds}
          multiple
          onChange={(options, optionIds) => onChange({ ...q, options, answer: { optionIds } })}
        />
      );
    case "NUMERIC":
      return <NumericFields q={q} onChange={onChange} />;
    case "EXPRESSION":
      return <ExpressionFields q={q} onChange={onChange} />;
    case "MATCHING":
      return (
        <MatchingEditor
          value={{ left: q.left, right: q.right, pairs: q.answer.pairs }}
          onChange={(v) => onChange({ ...q, left: v.left, right: v.right, answer: { pairs: v.pairs } })}
        />
      );
    default:
      return <p className="text-sm text-hint">Yozma savol: oʻquvchi yechimini yozadi, ustoz baholaydi.</p>;
  }
}
