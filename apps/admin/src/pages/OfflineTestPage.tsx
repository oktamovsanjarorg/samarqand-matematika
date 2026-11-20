import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AssignStudent } from "../components/offline/AssignStudent";
import { ScoresTable } from "../components/offline/ScoresTable";
import { Button, ErrorState, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { fmtDay, useOfflineTest } from "../lib/offline";

/** Bitta offline test: bo'limlar bo'yicha natija, moslanmaganlarni biriktirish */
export function OfflineTestPage() {
  const { id = "" } = useParams();
  const t = useOfflineTest(id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const remove = useMutation({
    mutationFn: () => api.del(`/admin/offline-tests/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["offline"] });
      navigate("/offline");
    },
  });
  return (
    <div className="space-y-4">
      <Link to="/offline" className="flex w-fit items-center gap-1 text-sm font-semibold text-link">
        <ArrowLeft size={16} /> Offline testlar
      </Link>
      {t.isPending && <SkeletonList rows={4} />}
      {t.isError && <ErrorState message={t.error.message} onRetry={() => t.refetch()} />}
      {t.data && (
        <>
          <div>
            <h1 className="text-xl font-extrabold">{t.data.title}</h1>
            <p className="text-sm text-hint">
              {fmtDay(t.data.date)}
              {t.data.groupName ? ` · ${t.data.groupName}` : ""} · {t.data.matched}/{t.data.count} moslangan
            </p>
          </div>
          <section className="card">
            <ScoresTable
              sections={t.data.sections}
              rows={t.data.rows.map((r) => ({ ...r, key: r.id }))}
              student={(r) => (
                <AssignStudent testId={id} resultId={r.id} userName={r.userName} rowName={r.name} />
              )}
            />
          </section>
          <Button variant="danger" onClick={() => remove.mutate()} busy={remove.isPending}>
            Testni oʻchirish
          </Button>
        </>
      )}
    </div>
  );
}
