import { QUESTION_TYPES, type QuestionType } from "@samarqand/shared";
import { Plus, Trash2 } from "lucide-react";
import { emptySection, type SectionDraft } from "../../lib/exam";
import { TYPE_LABELS } from "../../lib/questions";
import { Button } from "../ui";
import { field } from "./field";

function SectionRow(p: { n: number; s: SectionDraft; set: (s: SectionDraft) => void; remove?: () => void }) {
  const toggle = (t: QuestionType) =>
    p.set({ ...p.s, types: p.s.types.includes(t) ? p.s.types.filter((x) => x !== t) : [...p.s.types, t] });
  return (
    <li className="space-y-2 rounded-xl border border-hint/15 p-3" data-testid="exam-section">
      <div className="grid gap-2 sm:grid-cols-[1fr_6rem_6rem_auto] sm:items-end">
        <input
          value={p.s.title}
          onChange={(e) => p.set({ ...p.s, title: e.target.value })}
          placeholder={`${p.n}-boʻlim nomi`}
          aria-label={`${p.n}-boʻlim nomi`}
          className={field}
        />
        <label className="text-xs text-hint">
          Savollar
          <input
            value={p.s.count}
            onChange={(e) => p.set({ ...p.s, count: e.target.value })}
            inputMode="numeric"
            aria-label={`${p.n}-boʻlim savollari soni`}
            className={field}
          />
        </label>
        <label className="text-xs text-hint">
          Bitta savol bali
          <input
            value={p.s.points}
            onChange={(e) => p.set({ ...p.s, points: e.target.value })}
            inputMode="decimal"
            aria-label={`${p.n}-boʻlim bali`}
            className={field}
          />
        </label>
        {p.remove && (
          <Button variant="ghost" onClick={p.remove} aria-label={`${p.n}-boʻlimni oʻchirish`}>
            <Trash2 size={18} />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {QUESTION_TYPES.map((t) => (
          <label key={t} className="flex min-h-9 items-center gap-1.5 rounded-lg bg-hint/10 px-2 text-sm">
            <input type="checkbox" checked={p.s.types.includes(t)} onChange={() => toggle(t)} />
            {TYPE_LABELS[t]}
          </label>
        ))}
      </div>
    </li>
  );
}

/** Bo'limlar: har birida savol turlari, soni va bitta savol bali (xom ball) */
export function SectionsEditor({
  value,
  onChange,
}: {
  value: SectionDraft[];
  onChange: (v: SectionDraft[]) => void;
}) {
  const set = (i: number, s: SectionDraft) => onChange(value.map((x, k) => (k === i ? s : x)));
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold">Boʻlimlar</h3>
      <ul className="space-y-2">
        {value.map((s, i) => (
          <SectionRow
            key={i}
            n={i + 1}
            s={s}
            set={(x) => set(i, x)}
            remove={value.length > 1 ? () => onChange(value.filter((_, k) => k !== i)) : undefined}
          />
        ))}
      </ul>
      <Button variant="secondary" onClick={() => onChange([...value, emptySection()])}>
        <Plus size={16} /> Boʻlim qoʻshish
      </Button>
    </div>
  );
}
