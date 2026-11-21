import { EXPIRING_DAYS, type AdminDashboard } from "@samarqand/shared";
import {
  CheckCircle2,
  ChevronRight,
  CalendarClock,
  CreditCard,
  FileSpreadsheet,
  Image,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AttentionList } from "../components/dashboard/AttentionList";
import { ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { useDashboard } from "../lib/dashboard";

interface Todo {
  to: string;
  count: number;
  title: string;
  hint: string;
  Icon: LucideIcon;
}

const todos = (d: AdminDashboard): Todo[] =>
  [
    {
      to: "/students",
      count: d.todo.newStudents,
      title: "Yangi oʻquvchilar",
      hint: "Qabul qiling va kirish rejimini tanlang",
      Icon: UserPlus,
    },
    {
      to: "/payments",
      count: d.todo.pendingPayments,
      title: "Toʻlov cheklari",
      hint: "Chekni tekshirib tasdiqlang yoki rad eting",
      Icon: CreditCard,
    },
    {
      to: "/parents",
      count: d.todo.pendingParents,
      title: "Ota-ona soʻrovlari",
      hint: "Raqam va shubha belgilarini koʻrib tasdiqlang",
      Icon: Users,
    },
    ...d.todo.review.map((r) => ({
      to: `/weekly/${r.testId}/review`,
      count: r.count,
      title: `Yechimlar: ${r.title}`,
      hint: "Yozma yechim rasmlari bahoni kutyapti",
      Icon: Image,
    })),
    {
      // T-127: eslatish uchun: obunasi bir hafta ichida tugaydi va hali uzaytirilmagan
      to: "/students?filter=expiring",
      count: d.stats.expiringSoon,
      title: "Obunasi tugayotganlar",
      hint: `${EXPIRING_DAYS} kun ichida tugaydi: eslatib qoʻying`,
      Icon: CalendarClock,
    },
    {
      to: "/offline",
      count: d.todo.unmatchedOffline,
      title: "Moslanmagan offline natijalar",
      hint: "Qatorni oʻquvchiga biriktiring",
      Icon: FileSpreadsheet,
    },
  ].filter((t) => t.count > 0);

function TodoCard({ t }: { t: Todo }) {
  return (
    <li>
      <Link to={t.to} className="tap card flex items-center gap-3" data-testid="todo">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <t.Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{t.title}</p>
          <p className="text-sm text-hint">{t.hint}</p>
        </div>
        <span className="rounded-full bg-danger px-2.5 py-0.5 text-sm font-bold text-white tabular-nums">
          {t.count}
        </span>
        <ChevronRight size={18} className="text-hint" />
      </Link>
    </li>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="card">
      <p className="text-2xl font-extrabold tabular-nums text-brand">{value}</p>
      <p className="text-sm text-hint">{label}</p>
    </div>
  );
}

/** Muvaffaqiyat o'lchovlari (T-105): haftalik testda qatnashish va ota-onalar ulanganligi */
function Metrics({ s }: { s: AdminDashboard["stats"] }) {
  return (
    <>
      {s.lastWeekly ? (
        <Stat
          value={`${s.lastWeekly.submitted}/${s.lastWeekly.eligible}`}
          label={`«${s.lastWeekly.title}» ni topshirgan (toʻliq kirishlilardan)`}
        />
      ) : (
        <Stat value="–" label="Yopilgan haftalik test hali yoʻq" />
      )}
      <Stat value={`${s.parentsLinked}/${s.students}`} label="Ota-onasi ulangan oʻquvchilar" />
      {/* T-133: kuchsiz mavzuni qayta ishlaganda o'sish (00-vision) */}
      <Stat
        value={s.retries.count ? `${Math.round((s.retries.improved / s.retries.count) * 100)}%` : "–"}
        label={
          s.retries.count
            ? `Mavzu testini qayta ishlaganda natija oshgan (30 kun, ${s.retries.count} ta urinish)`
            : "30 kunda mavzu testi qayta ishlanmagan"
        }
      />
    </>
  );
}

/** Ustozni kutayotgan ishlar va qisqa holat (T-061) */
export function DashboardPage() {
  const d = useDashboard();
  const list = d.data ? todos(d.data) : [];
  return (
    <div className="space-y-6">
      <PageTitle title="Bosh sahifa" />
      {d.isPending && <SkeletonList rows={3} />}
      {d.isError && <ErrorState message={d.error.message} onRetry={() => d.refetch()} />}
      {d.data && (
        <>
          <section className="space-y-2" aria-label="Kutayotgan ishlar">
            <h2 className="font-bold">Kutayotgan ishlar</h2>
            {list.length === 0 ? (
              <div className="card flex items-center gap-3" data-testid="todo-empty">
                <CheckCircle2 size={22} className="text-success" />
                <p className="font-semibold">Hammasi joyida: hozircha kutayotgan ish yoʻq</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {list.map((t) => (
                  <TodoCard key={t.to} t={t} />
                ))}
              </ul>
            )}
          </section>
          <AttentionList />
          <section className="space-y-2" aria-label="Holat">
            <h2 className="font-bold">Holat</h2>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              <Stat value={d.data.stats.students} label="Oʻquvchilar" />
              <Stat value={d.data.stats.activeToday} label="Bugun kirgan" />
              <Stat value={d.data.stats.activeWeek} label="7 kunda faol" />
              {d.data.stats.groups ? (
                <Stat
                  value={`${d.data.stats.groupsMarkedToday}/${d.data.stats.groups}`}
                  label="Bugun davomat qilingan guruhlar"
                />
              ) : (
                <Stat value="–" label="Guruh hali yoʻq" />
              )}
              <Metrics s={d.data.stats} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
