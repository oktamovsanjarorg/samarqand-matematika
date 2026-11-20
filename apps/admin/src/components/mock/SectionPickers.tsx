import type { ExamSection, WeeklyQuestionRow } from "@samarqand/shared";
import { TYPE_LABELS } from "../../lib/questions";
import { Badge } from "../ui";
import { QuestionPicker } from "../weekly/QuestionPicker";

/** Shablon bo'limlari: har biriga shablondagi soni va turidagi savollar (BR-M01) */
export function SectionPickers(p: {
  sections: ExamSection[];
  value: WeeklyQuestionRow[][];
  onChange: (v: WeeklyQuestionRow[][]) => void;
}) {
  const all = p.value.flat().map((q) => q.id);
  return (
    <div className="space-y-3">
      {p.sections.map((s, i) => {
        const mine = p.value[i] ?? [];
        const ready = mine.length === s.count;
        return (
          <section
            key={i}
            className="space-y-2 rounded-xl border border-hint/15 p-3"
            data-testid="mock-section"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 flex-1 font-bold">
                {i + 1}. {s.title}
              </h3>
              <Badge tone={ready ? "success" : "hint"}>
                {mine.length}/{s.count}
              </Badge>
            </div>
            <p className="text-xs text-hint">
              {s.types.map((t) => TYPE_LABELS[t]).join(", ")} · har savol {s.points} ball
            </p>
            <QuestionPicker
              value={mine}
              types={s.types}
              taken={all.filter((id) => !mine.some((q) => q.id === id))}
              onChange={(v) => p.onChange(p.sections.map((_, k) => (k === i ? v : (p.value[k] ?? []))))}
            />
          </section>
        );
      })}
    </div>
  );
}
