import type { Ranking, RankRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { api } from "../../lib/api";

function Row({ r }: { r: RankRow }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.me ? "bg-brand/10 font-bold" : ""}`}>
      <span className={`w-7 text-center font-extrabold ${r.place <= 3 ? "text-accent" : "text-hint"}`}>
        {r.place}
      </span>
      <span className="min-w-0 flex-1 truncate">{r.me ? `${r.name} (siz)` : r.name}</span>
      <span className="font-bold">{r.score}</span>
    </li>
  );
}

/** Reyting (BR-W10): top va o'quvchining o'z o'rni. Server faqat yopilgan testlar bo'yicha beradi (BR-W08) */
export function RankingCard({ path, heading }: { path: string; heading: string }) {
  const q = useQuery({ queryKey: ["ranking", path], queryFn: () => api<Ranking>(path) });
  if (q.isPending) return <div className="skeleton h-24" aria-busy="true" />;
  if (q.isError || q.data.participants === 0) return null;
  const { top, me, participants } = q.data;
  const outside = me && !top.some((r) => r.me);
  return (
    <section className="card space-y-2" data-testid="ranking">
      <h2 className="flex items-center gap-2 font-bold">
        <Trophy size={18} className="text-accent" /> {heading}
        {me && (
          <span className="ml-auto text-sm font-semibold text-hint">
            oʻrningiz: {me.place}/{participants}
          </span>
        )}
      </h2>
      <ol className="space-y-1">
        {top.map((r, i) => (
          <Row key={i} r={r} />
        ))}
        {outside && (
          <>
            <li className="text-center text-hint" aria-hidden>
              ⋯
            </li>
            <Row r={me} />
          </>
        )}
      </ol>
    </section>
  );
}
