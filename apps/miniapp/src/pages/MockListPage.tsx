import { MockRow } from "../components/mock/MockRow";
import { OfflineResults } from "../components/mock/OfflineResults";
import { EmptyState, ErrorState } from "../components/states";
import { useBackButton } from "../hooks/useBackButton";
import { useMockList } from "../lib/mock";

export function MockListPage() {
  useBackButton("/");
  const list = useMockList();
  const now = new Date();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Mock imtihonlar</h1>
        <p className="text-sm text-hint">
          Milliy sertifikat formatida. Vaqt boshlaganingizdan hisoblanadi, AI yordamchi oʻchiq.
        </p>
      </div>
      {list.isPending && <div className="skeleton h-24" aria-busy="true" />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState title="Hozircha mock yoʻq" hint="Ustoz mock qoʻyganda shu yerda chiqadi" />
      )}
      <ul className="space-y-2">
        {list.data?.map((t) => (
          <li key={t.id}>
            <MockRow t={t} now={now} />
          </li>
        ))}
      </ul>
      <OfflineResults />
    </div>
  );
}
