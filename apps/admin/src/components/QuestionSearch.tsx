import type { AdminQuestionHit } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { TYPE_LABELS, manualBadge } from "../lib/questions";
import { MathText } from "./MathText";
import { Badge } from "./ui";

function Hits({ query }: { query: string }) {
  const found = useQuery({
    queryKey: ["questions", "search", query],
    queryFn: () => api.get<AdminQuestionHit[]>(`/admin/questions?q=${encodeURIComponent(query)}`),
  });
  if (found.isPending) return <div className="skeleton h-20" />;
  if (found.isError) return <p className="text-sm text-danger">{found.error.message}</p>;
  if (found.data.length === 0) return <p className="text-sm text-hint">Savol topilmadi</p>;
  return (
    <ul className="card divide-y divide-hint/10 p-0" data-testid="question-hits">
      {found.data.map((q) => (
        <li key={q.id}>
          <Link
            to={`/content/questions/${q.id}`}
            className="block min-h-11 space-y-1 px-4 py-3 hover:bg-hint/5"
          >
            <MathText text={q.text} className="line-clamp-2 text-sm" />
            <p className="text-xs text-hint">
              {q.topicTitle} · {TYPE_LABELS[q.type]}
            </p>
            <div className="flex flex-wrap gap-1">
              {!q.isPublished && <Badge>Nashrda emas</Badge>}
              {manualBadge(q) && <Badge tone="accent">Ustoz tekshiradi</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Kontent sahifasida savolni matn yoki teg bo'yicha topib, tahrirga o'tish (T-097) */
export function QuestionSearch() {
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  return (
    <div className="space-y-2">
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-hint/25 bg-section px-3">
        <Search size={16} className="shrink-0 text-hint" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Savolni qidiring: matn yoki teg"
          aria-label="Savolni qidirish"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      {query.length >= 2 && <Hits query={query} />}
    </div>
  );
}
