import type { Mistake } from "@samarqand/shared";
import { RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState } from "../components/states";
import { ResultItem } from "../components/test/ResultItem";
import { formatDay, useMistakes } from "../lib/me";

/** Mavzular bo'yicha, ro'yxatdagi tartibni saqlab (yangi xato birinchi) */
function byTopic(list: Mistake[]): { topicId: string; title: string; items: Mistake[] }[] {
  const groups = new Map<string, { topicId: string; title: string; items: Mistake[] }>();
  for (const m of list) {
    const g = groups.get(m.topicId) ?? { topicId: m.topicId, title: m.topicTitle, items: [] };
    g.items.push(m);
    groups.set(m.topicId, g);
  }
  return [...groups.values()];
}

/** Xatolarim (T-079): mavzu testida oxirgi marta xato ishlangan savollar, to'g'ri javob va yechim bilan */
export function MistakesPage() {
  const q = useMistakes();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Xatolarim</h1>
        <p className="text-sm text-hint">
          Mavzu testini qayta toʻgʻri ishlasangiz, savol roʻyxatdan chiqadi.
        </p>
      </div>
      {q.isPending && <div className="skeleton h-40" aria-busy="true" />}
      {q.isError && <ErrorState message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data?.length === 0 && (
        <EmptyState title="Xato yoʻq" hint="Mavzu testlarida xato ishlangan savollar shu yerda chiqadi." />
      )}
      {byTopic(q.data ?? []).map((g) => (
        <section key={g.topicId} className="space-y-2" data-testid="mistake-topic">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 truncate font-bold">{g.title}</h2>
            <Link
              to={`/topics/${g.topicId}/test`}
              className="tap flex min-h-10 items-center gap-1.5 text-sm font-semibold text-link"
            >
              <RotateCcw size={16} /> Qayta ishlash
            </Link>
          </div>
          <ul className="space-y-2">
            {g.items.map((m, i) => (
              <ResultItem key={m.item.question.id} item={m.item} n={i + 1}>
                <p className="text-xs text-hint">
                  {m.times} marta xato · oxirgisi {formatDay(m.at)}
                </p>
              </ResultItem>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
