import type { AttentionCode, AttentionRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { CalendarX, Moon, Phone, TrendingDown, FileWarning, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

const ICON: Record<AttentionCode, LucideIcon> = {
  INACTIVE: Moon,
  DROP: TrendingDown,
  ABSENT: CalendarX,
  MISSED_WEEKLY: FileWarning,
};
const SHOW = 5;

function Row({ r }: { r: AttentionRow }) {
  return (
    <li className="space-y-1 py-3" data-testid="attention-row">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <Link to={`/students/${r.userId}`} className="font-bold text-link hover:underline">
          {r.name}
        </Link>
        {r.groupName && <span className="text-xs text-hint">{r.groupName}</span>}
        {r.phone && (
          <a
            href={`tel:${r.phone}`}
            className="ml-auto flex items-center gap-1 text-sm font-semibold text-link"
          >
            <Phone size={14} /> {r.phone}
          </a>
        )}
      </div>
      <ul className="space-y-0.5">
        {r.reasons.map((x) => {
          const Icon = ICON[x.code];
          return (
            <li key={x.code} className="flex items-center gap-2 text-sm">
              <Icon size={14} className="shrink-0 text-danger" /> {x.text}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/** Ustozga: e'tibor kerak o'quvchilar va sabablari (T-063, BR-R02) */
export function AttentionList() {
  const q = useQuery({ queryKey: ["attention"], queryFn: () => api.get<AttentionRow[]>("/admin/attention") });
  const [all, setAll] = useState(false);
  if (!q.data) return null;
  const rows = all ? q.data : q.data.slice(0, SHOW);
  return (
    <section className="space-y-2" aria-label="Eʼtibor kerak">
      <h2 className="font-bold">Eʼtibor kerak oʻquvchilar</h2>
      {q.data.length === 0 ? (
        <p className="card text-sm text-hint">
          Hozircha hamma faol: faolsiz, natijasi tushgan yoki dars qoldirgan oʻquvchi yoʻq
        </p>
      ) : (
        <div className="card">
          <ul className="divide-y divide-hint/10">
            {rows.map((r) => (
              <Row key={r.userId} r={r} />
            ))}
          </ul>
          {q.data.length > SHOW && (
            <button
              type="button"
              onClick={() => setAll(!all)}
              className="mt-2 text-sm font-semibold text-link"
            >
              {all ? "Qisqartirish" : `Yana ${q.data.length - SHOW} ta`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
