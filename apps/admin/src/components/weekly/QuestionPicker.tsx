import type { AdminQuestionHit, AdminQuestionRow, QuestionType, WeeklyQuestionRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { api } from "../../lib/api";
import { useTree } from "../../lib/content";
import { TYPE_LABELS, manualBadge } from "../../lib/questions";
import { MathText } from "../MathText";
import { Badge } from "../ui";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

interface Pick {
  selected: string[];
  types?: QuestionType[];
  onAdd: (q: WeeklyQuestionRow) => void;
}

/** Belgilab qo'shiladigan savollar ro'yxati; showTopic: qidiruvda mavzu nomi ham ko'rinadi */
function PickList(p: Pick & { rows: (AdminQuestionRow & { topicTitle: string })[]; showTopic?: boolean }) {
  const rows = p.rows.filter((q) => !p.types || p.types.includes(q.type));
  if (rows.length === 0) return <p className="text-sm text-hint">Mos savol topilmadi</p>;
  return (
    <ul className="space-y-1">
      {rows.map((q) => (
        <li key={q.id}>
          <label
            className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-hint/5"
            data-testid="pick"
          >
            <input
              type="checkbox"
              checked={p.selected.includes(q.id)}
              disabled={p.selected.includes(q.id)}
              onChange={() => p.onAdd({ id: q.id, type: q.type, text: q.text, topicTitle: q.topicTitle })}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <MathText text={q.text} className="line-clamp-2 text-sm" />
              {p.showTopic && <p className="text-xs text-hint">{q.topicTitle}</p>}
              {manualBadge(q) && <Badge tone="accent">Ustoz tekshiradi</Badge>}
            </div>
          </label>
        </li>
      ))}
    </ul>
  );
}

function TopicQuestions(p: Pick & { topicId: string; topicTitle: string }) {
  const list = useQuery({
    queryKey: ["questions", p.topicId],
    queryFn: () => api.get<AdminQuestionRow[]>(`/admin/topics/${p.topicId}/questions`),
  });
  if (list.isPending) return <div className="skeleton h-20" />;
  return <PickList {...p} rows={(list.data ?? []).map((q) => ({ ...q, topicTitle: p.topicTitle }))} />;
}

/** Barcha kurslarda matn yoki teg bo'yicha qidiruv (T-096) */
function SearchQuestions(p: Pick & { query: string }) {
  const found = useQuery({
    queryKey: ["questions", "search", p.query],
    queryFn: () => api.get<AdminQuestionHit[]>(`/admin/questions?q=${encodeURIComponent(p.query)}`),
  });
  if (found.isPending) return <div className="skeleton h-20" />;
  if (found.isError) return <p className="text-sm text-danger">{found.error.message}</p>;
  return <PickList {...p} rows={found.data} showTopic />;
}

/** Tanlangan savollar tartib bilan; olib tashlash mumkin */
function SelectedList({
  value,
  onChange,
}: {
  value: WeeklyQuestionRow[];
  onChange: (v: WeeklyQuestionRow[]) => void;
}) {
  return (
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
  );
}

/** Mavzu tanlab, uning savollaridan qo'shish */
function TopicBrowse(p: Pick) {
  const topics =
    useTree().data?.flatMap((c) => c.topics.map((t) => ({ id: t.id, title: `${c.title} · ${t.title}` }))) ??
    [];
  const [topicId, setTopicId] = useState("");
  const topic = topics.find((t) => t.id === topicId);
  return (
    <>
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
      {topic && <TopicQuestions {...p} topicId={topic.id} topicTitle={topic.title} />}
    </>
  );
}

/**
 * Savollar bankidan tanlash: qidiruv yoki mavzu → savollar; tanlanganlar tartibi testdagi tartib.
 * types: faqat shu turlar (mock bo'limi); taken: boshqa bo'limlarda tanlanganlar
 */
export function QuestionPicker({
  value,
  onChange,
  types,
  taken = [],
}: {
  value: WeeklyQuestionRow[];
  onChange: (v: WeeklyQuestionRow[]) => void;
  types?: QuestionType[];
  taken?: string[];
}) {
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const pick: Pick = {
    selected: [...value.map((x) => x.id), ...taken],
    types,
    onAdd: (x) => onChange([...value, x]),
  };
  return (
    <div className="space-y-3">
      <SelectedList value={value} onChange={onChange} />
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-hint/25 bg-section px-3">
        <Search size={16} className="shrink-0 text-hint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Savolni qidiring: matn yoki teg"
          aria-label="Savolni qidirish"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      {query.length >= 2 ? <SearchQuestions {...pick} query={query} /> : <TopicBrowse {...pick} />}
    </div>
  );
}
