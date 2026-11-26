import { ChevronRight, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ImportForm } from "../components/offline/ImportForm";
import { OfflineRanking } from "../components/offline/OfflineRanking";
import { Badge, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { fmtDay, fmtScore, useOfflineTests } from "../lib/offline";

const TABS = [
  { id: "tests", label: "Testlar" },
  { id: "ranking", label: "Reyting" },
] as const;

function TestList() {
  const list = useOfflineTests();
  return (
    <>
      <ImportForm />
      {list.isPending && <SkeletonList rows={3} />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState title="Hali yuklanmagan" hint="Skaner yoki Excel natijasini yuklang" />
      )}
      <ul className="space-y-2">
        {list.data?.map((t) => (
          <li key={t.id}>
            <Link
              to={`/offline/${t.id}`}
              className="tap card flex items-center gap-3"
              data-testid="offline-test"
            >
              <FileSpreadsheet size={24} className="shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{t.title}</p>
                <p className="text-sm text-hint">
                  {fmtDay(t.date)}
                  {t.groupName ? ` · ${t.groupName}` : ""} · {t.questionCount} savol · {t.count} qatnashchi
                </p>
              </div>
              {t.matched < t.count && <Badge tone="danger">{t.count - t.matched} moslanmagan</Badge>}
              {t.avgScore !== null && (
                <Badge tone="brand">{`oʻrtacha ${fmtScore(t.avgScore)}/${t.scaleMax}`}</Badge>
              )}
              <ChevronRight size={18} className="shrink-0 text-hint" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Offline (qog'ozdagi) testlar: yuklash, ro'yxat va reyting (T-182) */
export function OfflineListPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("tests");
  return (
    <div className="space-y-4">
      <PageTitle title="Offline testlar" />
      <div className="flex gap-1 rounded-xl bg-section p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold ${tab === t.id ? "bg-brand text-white" : "text-hint"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "tests" ? <TestList /> : <OfflineRanking />}
    </div>
  );
}
