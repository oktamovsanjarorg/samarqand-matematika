import type { AdminWeeklyRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { formatDate } from "../lib/labels";
import { STATUS_LABELS } from "../lib/weekly";

const TONE = { UPCOMING: "hint", OPEN: "success", CLOSED: "brand" } as const;

export function WeeklyListPage() {
  const list = useQuery({ queryKey: ["weekly"], queryFn: () => api.get<AdminWeeklyRow[]>("/admin/weekly") });
  return (
    <div className="space-y-4">
      <PageTitle title="Haftalik testlar">
        <Link
          to="/weekly/new"
          className="tap flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Yangi test
        </Link>
      </PageTitle>
      {list.isPending && <SkeletonList />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState title="Haftalik test yoʻq" hint="Haftasiga bitta test: oyna dushanbadan yakshanbagacha" />
      )}
      <ul className="space-y-2">
        {list.data?.map((t) => (
          <li key={t.id}>
            <Link to={`/weekly/${t.id}`} className="card block space-y-1" data-testid="weekly">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 font-bold">{t.title}</span>
                {!t.isPublished && <Badge>Qoralama</Badge>}
                <Badge tone={TONE[t.status]}>{STATUS_LABELS[t.status]}</Badge>
              </div>
              <p className="text-sm text-hint">
                {formatDate(t.opensAt)} — {formatDate(t.closesAt)}
              </p>
              <p className="text-sm text-hint">
                {t.questionCount} ta savol · topshirgan: {t.submitted}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
