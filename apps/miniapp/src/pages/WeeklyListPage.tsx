import { EmptyState, ErrorState } from "../components/states";
import { RankingCard } from "../components/weekly/RankingCard";
import { WeeklyRow } from "../components/weekly/WeeklyRow";
import { useBackButton } from "../hooks/useBackButton";
import { useWeeklyList } from "../lib/weekly";

export function WeeklyListPage() {
  useBackButton("/");
  const list = useWeeklyList();
  const now = new Date();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Haftalik testlar</h1>
        <p className="text-sm text-hint">
          Har hafta bitta test. Bir marta ishlanadi, natija oyna yopilgach chiqadi.
        </p>
      </div>
      {list.isPending && <div className="skeleton h-24" aria-busy="true" />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState
          title="Hozircha haftalik test yoʻq"
          hint="Ustoz test qoʻyganda shu yerda chiqadi va bot xabar beradi"
        />
      )}
      <ul className="space-y-2">
        {list.data?.map((t) => (
          <li key={t.id}>
            <WeeklyRow t={t} now={now} />
          </li>
        ))}
      </ul>
      <RankingCard path="/weekly-ranking" heading="Umumiy reyting" />
    </div>
  );
}
