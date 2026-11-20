import type { Choice } from "@samarqand/shared";
import { Plus } from "lucide-react";
import { keyAt } from "../../lib/questions";

interface Value {
  left: Choice[];
  right: Choice[];
  pairs: Record<string, string>;
}
const input = "min-h-11 min-w-0 flex-1 rounded-lg border border-hint/25 bg-section px-2 text-sm";

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 items-center gap-1 text-sm font-semibold text-link"
    >
      <Plus size={16} /> {label}
    </button>
  );
}

function LeftRow(p: {
  item: Choice;
  right: Choice[];
  pair: string;
  onText: (t: string) => void;
  onPair: (r: string) => void;
}) {
  const label = p.item.id.toUpperCase();
  return (
    <div className="flex items-center gap-2" data-testid="match-left">
      <span className="w-5 font-bold">{label}</span>
      <input
        value={p.item.text}
        onChange={(e) => p.onText(e.target.value)}
        aria-label={`Chap ${label}`}
        className={input}
      />
      <select
        value={p.pair}
        onChange={(e) => p.onPair(e.target.value)}
        aria-label={`${label} juft`}
        className="min-h-11 rounded-lg border border-hint/25 bg-section px-2 text-sm"
      >
        <option value="">—</option>
        {p.right.map((r) => (
          <option key={r.id} value={r.id}>
            {r.id}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Moslashtirish: chap ustun (a, b, ...) har biri o'ng ustundagi (1, 2, ...) bittasiga mos (BR-M03) */
export function MatchingEditor({ value, onChange }: { value: Value; onChange: (v: Value) => void }) {
  const setText = (side: "left" | "right", i: number, text: string) =>
    onChange({ ...value, [side]: value[side].map((x, j) => (j === i ? { ...x, text } : x)) });
  const addLeft = () =>
    onChange({ ...value, left: [...value.left, { id: keyAt(value.left.length), text: "" }] });
  const addRight = () =>
    onChange({ ...value, right: [...value.right, { id: String(value.right.length + 1), text: "" }] });

  return (
    <fieldset className="grid gap-4 md:grid-cols-2">
      <legend className="mb-2 text-xs font-semibold text-hint">
        Juftlar: har chap element uchun toʻgʻri javobni tanlang
      </legend>
      <div className="space-y-2">
        {value.left.map((l, i) => (
          <LeftRow
            key={l.id}
            item={l}
            right={value.right}
            pair={value.pairs[l.id] ?? ""}
            onText={(t) => setText("left", i, t)}
            onPair={(r) => onChange({ ...value, pairs: { ...value.pairs, [l.id]: r } })}
          />
        ))}
        {value.left.length < 8 && <AddButton label="Chap element" onClick={addLeft} />}
      </div>
      <div className="space-y-2">
        {value.right.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2">
            <span className="w-5 font-bold">{r.id}</span>
            <input
              value={r.text}
              onChange={(e) => setText("right", i, e.target.value)}
              aria-label={`Oʻng ${r.id}`}
              className={input}
            />
          </div>
        ))}
        {value.right.length < 10 && <AddButton label="Oʻng element" onClick={addRight} />}
      </div>
    </fieldset>
  );
}
