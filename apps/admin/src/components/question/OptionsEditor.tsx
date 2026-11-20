import type { Choice } from "@samarqand/shared";
import { Plus, X } from "lucide-react";
import { keyAt } from "../../lib/questions";
import { MathText } from "../MathText";

function OptionRow(p: {
  option: Choice;
  checked: boolean;
  multiple: boolean;
  canRemove: boolean;
  onToggle: () => void;
  onText: (text: string) => void;
  onRemove: () => void;
}) {
  const label = p.option.id.toUpperCase();
  return (
    <div className="space-y-1 rounded-xl border border-hint/15 p-2" data-testid="option">
      <div className="flex items-center gap-2">
        <input
          type={p.multiple ? "checkbox" : "radio"}
          name="correct"
          checked={p.checked}
          onChange={p.onToggle}
          aria-label={`${label} toʻgʻri`}
          className="h-5 w-5 shrink-0"
        />
        <span className="w-5 font-bold">{label}</span>
        <input
          value={p.option.text}
          onChange={(e) => p.onText(e.target.value)}
          aria-label={`${label} variant`}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-hint/25 bg-section px-2 text-sm"
        />
        <button
          type="button"
          disabled={!p.canRemove}
          onClick={p.onRemove}
          aria-label={`${label} variantni oʻchirish`}
          className="flex h-10 w-10 items-center justify-center text-hint disabled:opacity-30"
        >
          <X size={16} />
        </button>
      </div>
      {p.option.text.includes("$") && <MathText text={p.option.text} className="pl-14 text-sm" />}
    </div>
  );
}

/** Variantlar: matn (LaTeX bilan), to'g'risini belgilash, qo'shish/o'chirish. Kalitlar a, b, c ... tartibda qayta beriladi */
export function OptionsEditor(p: {
  options: Choice[];
  correct: string[];
  multiple: boolean;
  onChange: (options: Choice[], correct: string[]) => void;
}) {
  const rekey = (list: Choice[], correct: string[]) => {
    const map = new Map(list.map((o, i) => [o.id, keyAt(i)]));
    p.onChange(
      list.map((o, i) => ({ ...o, id: keyAt(i) })),
      correct.flatMap((c) => (map.has(c) ? [map.get(c) as string] : [])),
    );
  };
  const toggle = (id: string) => {
    if (!p.multiple) return p.onChange(p.options, [id]);
    p.onChange(p.options, p.correct.includes(id) ? p.correct.filter((c) => c !== id) : [...p.correct, id]);
  };
  const setText = (i: number, text: string) =>
    p.onChange(
      p.options.map((x, j) => (j === i ? { ...x, text } : x)),
      p.correct,
    );

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-hint">
        Variantlar ({p.multiple ? "toʻgʻrilarini" : "toʻgʻrisini"} belgilang)
      </legend>
      {p.options.map((o, i) => (
        <OptionRow
          key={o.id}
          option={o}
          checked={p.correct.includes(o.id)}
          multiple={p.multiple}
          canRemove={p.options.length > 2}
          onToggle={() => toggle(o.id)}
          onText={(t) => setText(i, t)}
          onRemove={() =>
            rekey(
              p.options.filter((_, j) => j !== i),
              p.correct.filter((c) => c !== o.id),
            )
          }
        />
      ))}
      {p.options.length < 8 && (
        <button
          type="button"
          onClick={() => rekey([...p.options, { id: "new", text: "" }], p.correct)}
          className="flex min-h-10 items-center gap-1 text-sm font-semibold text-link"
        >
          <Plus size={16} /> Variant
        </button>
      )}
    </fieldset>
  );
}
