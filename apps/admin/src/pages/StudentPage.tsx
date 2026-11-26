import type { AdminStudentCard } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BlockControl } from "../components/students/BlockControl";
import {
  OfflineSection,
  SchoolSection,
  StatusSection,
  StudySection,
} from "../components/students/CardSections";
import { MocksSection, PaymentsSection, WeeklySection } from "../components/students/HistorySections";
import { StudentCard } from "../components/students/StudentCard";
import { EmptyState, ErrorState, SkeletonList } from "../components/ui";
import { api } from "../lib/api";

const TABS = { overview: "Umumiy", results: "Natijalar", billing: "Toʻlov", settings: "Sozlamalar" } as const;
type Tab = keyof typeof TABS;
const isTab = (t: string | null): t is Tab => !!t && t in TABS;

function Tabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex max-w-full overflow-x-auto rounded-xl bg-section p-1" role="tablist">
      {(Object.keys(TABS) as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={value === t}
          onClick={() => onChange(t)}
          className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold ${value === t ? "bg-brand text-white" : "text-hint"}`}
        >
          {TABS[t]}
        </button>
      ))}
    </div>
  );
}

function Body({ c, tab }: { c: AdminStudentCard; tab: Tab }) {
  if (tab === "results" && !c.weekly.length && !c.mocks.length && !c.offline.length)
    return (
      <EmptyState
        title="Natija hali yoʻq"
        hint="Haftalik test, mock yoki offline test topshirgach shu yerda chiqadi"
      />
    );
  if (tab === "results")
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklySection c={c} />
        <MocksSection c={c} />
        <OfflineSection c={c} />
      </div>
    );
  if (tab === "billing") return <PaymentsSection c={c} />;
  if (tab === "settings")
    return (
      <section className="card space-y-3">
        <h2 className="font-extrabold">Bloklash</h2>
        <BlockControl s={c.student} />
      </section>
    );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StatusSection c={c} />
      <StudySection c={c} />
      <SchoolSection c={c} />
    </div>
  );
}

/** O'quvchi kartasi (T-068, T-187): sarlavha, keyin bo'limlar tablarda */
export function StudentPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab");
  const tab: Tab = isTab(asked) ? asked : "overview";
  const card = useQuery({
    queryKey: ["student", id],
    queryFn: () => api.get<AdminStudentCard>(`/admin/students/${id}`),
  });
  return (
    <div className="space-y-4">
      <Link to="/students" className="flex items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft size={16} /> Oʻquvchilar
      </Link>
      {card.isPending && <SkeletonList rows={3} />}
      {card.isError && <ErrorState message={card.error.message} onRetry={() => card.refetch()} />}
      {card.data && (
        <>
          <ul>
            <StudentCard s={card.data.student} />
          </ul>
          <Tabs
            value={tab}
            onChange={(t) => setParams(t === "overview" ? {} : { tab: t }, { replace: true })}
          />
          <Body c={card.data} tab={tab} />
        </>
      )}
    </div>
  );
}
