import type { MonthStats } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { WeeksChart } from "../components/stats/WeeksChart";
import { EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { tashkentToday } from "../lib/groups";

const percent = (v: number | null) => (v === null ? "–" : `${v}%`);

function Stat(p: { value: string | number; label: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-2xl font-extrabold tabular-nums text-brand">{p.value}</p>
      <p className="text-sm text-hint">{p.label}</p>
      {p.hint && <p className="text-xs text-hint">{p.hint}</p>}
    </div>
  );
}

function Attendance({ a }: { a: MonthStats["attendance"] }) {
  return (
    <section className="card space-y-2" aria-label="Davomat guruhlar boʻyicha">
      <h2 className="font-bold">Davomat guruhlar boʻyicha</h2>
      {a.byGroup.length === 0 ? (
        <p className="text-sm text-hint">Bu oyda davomat olinmagan</p>
      ) : (
        <ul className="divide-y divide-hint/15 text-sm">
          {a.byGroup.map((g) => (
            <li key={g.groupId} className="flex items-center justify-between gap-2 py-2">
              <Link to={`/groups/${g.groupId}`} className="min-w-0 truncate font-semibold text-link">
                {g.name}
              </Link>
              <span className="shrink-0 tabular-nums text-hint">
                {g.days} kun · kelmagan {g.absent} · <b className="text-text">{percent(g.rate)}</b>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Top({ top }: { top: MonthStats["top"] }) {
  return (
    <section className="card space-y-2" aria-label="Eng yaxshilar">
      <h2 className="font-bold">Eng yaxshilar</h2>
      {top.length === 0 ? (
        <p className="text-sm text-hint">Mavzu testlarida kamida 20 ta javob bergan oʻquvchi yoʻq</p>
      ) : (
        <ol className="space-y-1 text-sm">
          {top.map((t, i) => (
            <li key={t.userId} className="flex items-center justify-between gap-2">
              <Link to={`/students/${t.userId}`} className="min-w-0 truncate font-semibold text-link">
                {i + 1}. {t.name}
              </Link>
              <span className="shrink-0 tabular-nums text-hint">
                {t.answers} ta javob · <b className="text-text">{t.percent}%</b>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Body({ s }: { s: MonthStats }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <Stat
          value={s.students.total}
          label="Oʻquvchilar"
          hint={`+${s.students.newThisMonth} shu oyda qabul qilingan`}
        />
        <Stat value={s.students.active} label="Shu oyda test topshirgan" />
        <Stat
          value={percent(s.attendance.rate)}
          label="Davomat"
          hint={`${s.attendance.absent} marta kelmagan`}
        />
        <Stat
          value={percent(s.topicTests.correctPercent)}
          label="Mavzu testlarida toʻgʻri"
          hint={`${s.topicTests.attempts} ta test topshirilgan`}
        />
        <Stat
          value={percent(s.weekly.avgPercent)}
          label="Haftalik testlarda oʻrtacha"
          hint={`${s.weekly.tests} ta test, ${s.weekly.submitted} ta topshirish`}
        />
      </div>
      <WeeksChart weeks={s.weeks} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Top top={s.top} />
        <Attendance a={s.attendance} />
      </div>
    </>
  );
}

/** Oy statistikasi (T-162): o'quvchilar qanday o'qiyapti va kim yaxshi; pul ma'lumoti "Toʻlovlar"da */
export function StatsPage() {
  const current = tashkentToday().slice(0, 7);
  const [month, setMonth] = useState(current);
  const q = useQuery({
    queryKey: ["stats", month],
    queryFn: () => api.get<MonthStats>(`/admin/stats?month=${month}`),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });
  return (
    <div className="space-y-4">
      <PageTitle title="Statistika">
        <input
          type="month"
          value={month}
          max={current}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="Oy"
          className="min-h-11 rounded-xl border border-hint/25 bg-section px-3 text-sm"
        />
      </PageTitle>
      {q.isPending && <SkeletonList rows={3} />}
      {q.isError && <ErrorState message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data && q.data.students.total === 0 && <EmptyState title="Hali oʻquvchi yoʻq" />}
      {q.data && q.data.students.total > 0 && <Body s={q.data} />}
    </div>
  );
}
