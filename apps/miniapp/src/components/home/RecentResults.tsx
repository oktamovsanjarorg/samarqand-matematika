import type { AttemptSummary } from "@samarqand/shared";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDay } from "../../lib/me";

export function RecentResults({ items }: { items: AttemptSummary[] }) {
  return (
    <section className="card space-y-1 p-3" data-testid="recent">
      <h2 className="px-1 font-bold">Oxirgi natijalar</h2>
      <ul>
        {items.map((r) => (
          <li key={r.id}>
            <Link to={`/attempts/${r.id}`} className="tap flex min-h-12 items-center gap-3 rounded-xl px-1">
              <span className="min-w-0 flex-1 truncate text-[15px]">{r.topicTitle}</span>
              <span className="text-xs text-hint">{formatDay(r.submittedAt)}</span>
              <span className="w-12 text-right font-bold text-brand">
                {r.checkable ? `${r.correct}/${r.checkable}` : "—"}
              </span>
              <ChevronRight size={18} className="text-hint" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
