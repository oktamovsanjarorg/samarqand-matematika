import { ChevronRight, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { ImportForm } from "../components/offline/ImportForm";
import { Badge, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { fmtDay, useOfflineTests } from "../lib/offline";

/** Tashqi (offline) testlar: yuklash va ro'yxat (T-056) */
export function OfflineListPage() {
  const list = useOfflineTests();
  return (
    <div className="space-y-4">
      <PageTitle title="Offline testlar" />
      <ImportForm />
      {list.isPending && <SkeletonList rows={3} />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState title="Hali yuklanmagan" hint="Skaner yoki Excel natijasini CSV qilib yuklang" />
      )}
      <ul className="space-y-2">
        {list.data?.map((t) => (
          <li key={t.id}>
            <Link
              to={`/offline/${t.id}`}
              className="tap card flex items-center gap-3"
              data-testid="offline-test"
            >
              <FileSpreadsheet size={24} className="text-brand" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{t.title}</p>
                <p className="text-sm text-hint">
                  {fmtDay(t.date)}
                  {t.groupName ? ` · ${t.groupName}` : ""} · {t.count} natija
                </p>
              </div>
              {t.matched < t.count && <Badge tone="danger">{t.count - t.matched} moslanmagan</Badge>}
              <ChevronRight size={18} className="text-hint" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
