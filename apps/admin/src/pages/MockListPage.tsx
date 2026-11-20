import type { AdminMockRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { formatDate } from "../lib/labels";
import { STATUS_LABELS } from "../lib/weekly";

const TONE = { UPCOMING: "hint", OPEN: "success", CLOSED: "brand" } as const;

export function MockListPage() {
  const list = useQuery({ queryKey: ["mocks"], queryFn: () => api.get<AdminMockRow[]>("/admin/mocks") });
  return (
    <div className="space-y-4">
      <PageTitle title="Mocklar">
        <Link
          to="/mocks/new"
          className="tap flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Yangi mock
        </Link>
      </PageTitle>
      {list.isPending && <SkeletonList />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState title="Mock yoʻq" hint="Mock imtihon shabloni asosida tuziladi (Sozlamalar)" />
      )}
      <ul className="space-y-2">
        {list.data?.map((t) => (
          <li key={t.id}>
            <Link to={`/mocks/${t.id}`} className="card block space-y-1" data-testid="mock">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 font-bold">{t.title}</span>
                {!t.isPublished && <Badge>Qoralama</Badge>}
                <Badge tone={TONE[t.status]}>{STATUS_LABELS[t.status]}</Badge>
              </div>
              <p className="text-sm text-hint">
                {formatDate(t.opensAt)} — {formatDate(t.closesAt)}
              </p>
              <p className="text-sm text-hint">
                {t.templateName} · {t.questionCount} ta savol · topshirgan: {t.submitted}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
