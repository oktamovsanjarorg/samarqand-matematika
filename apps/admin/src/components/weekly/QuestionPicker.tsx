import type { AdminQuestionRow, WeeklyQuestionRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { useTree } from "../../lib/content";
import { TYPE_LABELS } from "../../lib/questions";
import { MathText } from "../MathText";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

function TopicQuestions(p: {
  topicId: string;
  topicTitle: string;
  selected: string[];
  onAdd: (q: WeeklyQuestionRow) => void;
}) {
  const list = useQuery({
    queryKey: ["questions", p.topicId],
    queryFn: () => api.get<AdminQuestionRow[]>(`/admin/topics/${p.topicId}/questions`),
  });
  if (list.isPending) return <div className="skeleton h-20" />;
  if (list.data?.length === 0) return <p className="text-sm text-hint">Bu mavzuda savol yoʻq</p>;
  return (
    <ul className="space-y-1">
      {list.data?.map((q) => (
        <li key={q.id}>
          <label
            className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-hint/5"
            data-testid="pick"
          >
            <input
              type="checkbox"
              checked={p.selected.includes(q.id)}
              disabled={p.selected.includes(q.id)}
              onChange={() => p.onAdd({ id: q.id, type: q.type, text: q.text, topicTitle: p.topicTitle })}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <MathText text={q.text} className="line-clamp-2 flex-1 text-sm" />
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Savollar bankidan tanlash: mavzu → savollar; tanlanganlar tartibi testdagi tartib */
export function QuestionPicker({
  value,
  onChange,
}: {
  value: WeeklyQuestionRow[];
  onChange: (v: WeeklyQuestionRow[]) => void;
}) {
  const topics =
    useTree().data?.flatMap((c) => c.topics.map((t) => ({ id: t.id, title: `${c.title} · ${t.title}` }))) ??
    [];
  const [topicId, setTopicId] = useState("");
  const topic = topics.find((t) => t.id === topicId);
  const ids = value.map((q) => q.id);
  return (
    <div className="space-y-3">
      <ol className="space-y-1" data-testid="selected">
        {value.map((q, i) => (
          <li key={q.id} className="flex items-start gap-2 rounded-lg border border-hint/15 p-2 text-sm">
            <b className="w-6 shrink-0">{i + 1}.</b>
            <div className="min-w-0 flex-1">
              <MathText text={q.text} className="line-clamp-2" />
              <p className="text-xs text-hint">
                {q.topicTitle} · {TYPE_LABELS[q.type]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x.id !== q.id))}
              aria-label={`${i + 1}-savolni olib tashlash`}
              className="flex h-9 w-9 items-center justify-center text-hint"
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ol>
      <select
        value={topicId}
        onChange={(e) => setTopicId(e.target.value)}
        aria-label="Mavzu"
        className={field}
      >
        <option value="">Savol qoʻshish uchun mavzuni tanlang</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
      {topic && (
        <TopicQuestions
          topicId={topic.id}
          topicTitle={topic.title}
          selected={ids}
          onAdd={(q) => onChange([...value, q])}
        />
      )}
    </div>
  );
}
