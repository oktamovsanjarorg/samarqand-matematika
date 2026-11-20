import { Plus, Trash2 } from "lucide-react";
import type { GradeDraft } from "../../lib/exam";
import { Button } from "../ui";
import { field } from "./field";

/** Darajalar yuqoridan pastga: ball chegarasi shu va undan yuqori (BR-M02) */
export function GradesEditor({
  value,
  onChange,
}: {
  value: GradeDraft[];
  onChange: (v: GradeDraft[]) => void;
}) {
  const set = (i: number, g: GradeDraft) => onChange(value.map((x, k) => (k === i ? g : x)));
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold">Darajalar</h3>
      <p className="text-xs text-hint">Yuqoridan pastga. Eng past chegaradan kam ball darajasiz qoladi</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {value.map((g, i) => (
          <li key={i} className="flex gap-2" data-testid="exam-grade">
            <input
              value={g.label}
              onChange={(e) => set(i, { ...g, label: e.target.value })}
              placeholder="A+"
              aria-label={`${i + 1}-daraja nomi`}
              className={`${field} w-20`}
            />
            <input
              value={g.min}
              onChange={(e) => set(i, { ...g, min: e.target.value })}
              inputMode="decimal"
              placeholder="Kamida"
              aria-label={`${i + 1}-daraja chegarasi`}
              className={field}
            />
            <Button
              variant="ghost"
              onClick={() => onChange(value.filter((_, k) => k !== i))}
              aria-label={`${i + 1}-darajani oʻchirish`}
            >
              <Trash2 size={18} />
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="secondary" onClick={() => onChange([...value, { label: "", min: "" }])}>
        <Plus size={16} /> Daraja qoʻshish
      </Button>
    </div>
  );
}
