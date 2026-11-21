import type { ChildSummary, ChildView } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ClipboardList, Target, Users } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "../../lib/api";
import { formatDay } from "../../lib/me";
import { EmptyState } from "../states";

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-sm font-bold">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

const pct = (c: number, of: number) => (of ? Math.round((c / of) * 100) : 0);

function Attendance({ s }: { s: ChildSummary }) {
  const n = (st: string) => s.attendance.filter((a) => a.status === st).length;
  return (
    <Block
      icon={<Users size={16} className="text-brand" />}
      title={s.group ? s.group.name : "Guruhga biriktirilmagan"}
    >
      {s.attendance.length > 0 ? (
        <p className="text-sm">
          Oxirgi 30 kun: keldi {n("PRESENT")}, kechikdi {n("LATE")}, kelmadi {n("ABSENT")}
        </p>
      ) : (
        <p className="text-sm text-hint">Davomat hali belgilanmagan</p>
      )}
    </Block>
  );
}

function Results({ s }: { s: ChildSummary }) {
  return (
    <Block icon={<ClipboardList size={16} className="text-brand" />} title="Natijalar">
      <p className="text-sm">
        Mavzu testlari: {s.tests} ta{s.averagePercent === null ? "" : `, oʻrtacha ${s.averagePercent}%`}
      </p>
      <ul className="divide-y divide-hint/10 text-sm">
        {s.weekly.map((w) => (
          <li key={w.id} className="flex items-center gap-2 py-1.5">
            <CalendarCheck size={14} className="shrink-0 text-hint" />
            <span className="min-w-0 flex-1 truncate">{w.title}</span>
            <span className="font-bold tabular-nums">
              {w.submitted ? `${w.score}/${w.total}` : "Topshirmagan"}
            </span>
          </li>
        ))}
        {s.recent.map((a) => (
          <li key={a.id} className="flex items-center gap-2 py-1.5">
            <span className="min-w-0 flex-1 truncate">{a.topicTitle}</span>
            <span className="text-xs text-hint">{formatDay(a.submittedAt)}</span>
            <span className="font-bold tabular-nums">{pct(a.correct, a.checkable)}%</span>
          </li>
        ))}
        {s.offline.map((o) => (
          <li key={o.id} className="flex items-center gap-2 py-1.5">
            <span className="min-w-0 flex-1 truncate">{o.title}</span>
            <span className="font-bold tabular-nums">
              {o.total} · {o.place}/{o.participants}-oʻrin
            </span>
          </li>
        ))}
      </ul>
    </Block>
  );
}

function ChildCard({ c }: { c: ChildView }) {
  const q = useQuery({
    queryKey: ["child", c.studentId],
    queryFn: () => api<ChildSummary>(`/me/children/${c.studentId}`),
  });
  return (
    <section className="card space-y-4" data-testid="child">
      <h2 className="text-lg font-extrabold">{c.name}</h2>
      {q.isPending && <div className="skeleton h-24" aria-busy="true" />}
      {q.isError && <p className="text-sm text-danger">{q.error.message}</p>}
      {q.data && (
        <>
          <Attendance s={q.data} />
          <Results s={q.data} />
          {q.data.weak.length > 0 && (
            <Block icon={<Target size={16} className="text-danger" />} title="Takrorlash kerak">
              {q.data.weak.map((w) => (
                <p key={w.topicTitle} className="text-sm">
                  {w.topicTitle}: {w.total} ta savoldan {w.percent}% toʻgʻri
                </p>
              ))}
            </Block>
          )}
        </>
      )}
    </section>
  );
}

/** Ota-ona kabineti (T-069): tasdiqlangan farzandlar va ularning faktli holati */
export function ParentHome() {
  const children = useQuery({ queryKey: ["children"], queryFn: () => api<ChildView[]>("/me/children") });
  if (children.isPending) return <div className="skeleton h-40" aria-busy="true" />;
  if (!children.data?.length)
    return (
      <EmptyState
        title="Farzand hali ulanmagan"
        hint="Farzandingiz botga /ota yuborib, havolani sizga joʻnatadi. Ustoz tasdiqlagach natijalar shu yerda chiqadi."
      />
    );
  return (
    <div className="space-y-4">
      {children.data.map((c) => (
        <ChildCard key={c.studentId} c={c} />
      ))}
    </div>
  );
}
