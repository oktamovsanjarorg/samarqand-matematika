import { BROADCAST_AUDIENCE_LABELS, type BroadcastLogRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/labels";

export const HISTORY_KEY = ["broadcast-history"];

/** Oxirgi e'lonlar (T-117): qachon, kimga, nechtasiga yetdi va matni */
export function BroadcastHistory() {
  const q = useQuery({
    queryKey: HISTORY_KEY,
    queryFn: () => api.get<BroadcastLogRow[]>("/admin/broadcast"),
  });
  if (q.isPending) return <div className="skeleton h-20" />;
  if (q.error) return <p className="text-sm text-danger">{q.error.message}</p>;
  if (!q.data.length) return null;
  return (
    <section className="card space-y-2" aria-label="Yuborilgan eʼlonlar">
      <h2 className="font-bold">Yuborilgan eʼlonlar</h2>
      <ul className="divide-y divide-hint/10 text-sm">
        {q.data.map((r) => (
          <li key={r.id} className="space-y-1 py-2" data-testid="broadcast-row">
            <p className="text-xs text-hint">
              {formatDate(r.at)} · {BROADCAST_AUDIENCE_LABELS[r.audience]}
              {r.groupName ? ` · ${r.groupName}` : ""} · {r.sent}/{r.recipients} yetdi
            </p>
            <p className="whitespace-pre-wrap break-words">{r.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
