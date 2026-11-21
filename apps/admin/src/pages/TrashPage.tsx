import { TRASH_DAYS, TRASH_LABELS, type TrashRow } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { MathText } from "../components/MathText";
import { Badge, Button, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { TREE_KEY } from "../lib/content";
import { formatDate } from "../lib/labels";

const KEY = ["trash"];
const DAY = 86_400_000;

function daysLeft(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY));
}

function Row({ r }: { r: TrashRow }) {
  const qc = useQueryClient();
  const restore = useMutation({
    mutationFn: () => api.post(`/admin/trash/${r.id}/restore`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: TREE_KEY });
      void qc.invalidateQueries({ queryKey: ["questions"] });
    },
  });
  return (
    <li className="space-y-2 px-4 py-3" data-testid="trash-row">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{TRASH_LABELS[r.entity]}</Badge>
            {r.entity === "Question" ? (
              <MathText text={r.title} className="line-clamp-2 text-sm font-semibold" />
            ) : (
              <b className="text-sm">{r.title}</b>
            )}
          </div>
          {r.place && <p className="text-xs text-hint">{r.place}</p>}
          <p className="text-xs text-hint">
            {r.deletedBy ?? "Nomaʼlum"} · {formatDate(r.deletedAt)} · {daysLeft(r.expiresAt)} kundan keyin
            butunlay oʻchadi
          </p>
        </div>
        <Button variant="secondary" busy={restore.isPending} onClick={() => restore.mutate()}>
          <RotateCcw size={16} /> Tiklash
        </Button>
      </div>
      {restore.error && (
        <p className="text-sm text-danger" role="alert">
          {restore.error.message}
        </p>
      )}
    </li>
  );
}

/** Axlat qutisi (T-099, FR-U05): o'chirilgan kontentni tiklash */
export function TrashPage() {
  const list = useQuery({ queryKey: KEY, queryFn: () => api.get<TrashRow[]>("/admin/trash") });
  return (
    <div className="space-y-4">
      <PageTitle title="Axlat qutisi" />
      <p className="text-sm text-hint">
        Oʻchirilgan kurs, mavzu, dars va savollar {TRASH_DAYS} kun shu yerda turadi. Tiklangani roʻyxat
        oxiriga qoʻyiladi.
      </p>
      {list.isPending && <SkeletonList rows={3} />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState
          title="Axlat qutisi boʻsh"
          hint="Kontentdan biror narsa oʻchirilsa, shu yerda paydo boʻladi"
        />
      )}
      {!!list.data?.length && (
        <ul className="card divide-y divide-hint/10 p-0">
          {list.data.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
