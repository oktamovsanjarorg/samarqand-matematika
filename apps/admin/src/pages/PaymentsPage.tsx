import { formatSum, type AdminPayment } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import { useState } from "react";
import { ReceiptImage } from "../components/ReceiptImage";
import { RejectForm, StatusTabs, type Status } from "../components/ReviewParts";
import { Button, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { formatDate } from "../lib/labels";

function Actions({ p, onDone }: { p: AdminPayment; onDone: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const approve = useMutation({
    mutationFn: () => api.post(`/admin/payments/${p.id}/approve`),
    onSuccess: onDone,
  });
  return (
    <div className="space-y-2">
      <p className="text-xs text-hint">Kartaga {formatSum(p.amountUzs)} soʻm tushganini tekshiring.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => approve.mutate()} busy={approve.isPending}>
          Tasdiqlash
        </Button>
        <Button variant="secondary" onClick={() => setRejecting((v) => !v)}>
          Rad etish
        </Button>
      </div>
      {rejecting && (
        <RejectForm
          url={`/admin/payments/${p.id}/reject`}
          placeholder="Sabab (oʻquvchiga yuboriladi)"
          onDone={onDone}
        />
      )}
      {approve.error && <p className="text-sm text-danger">{approve.error.message}</p>}
    </div>
  );
}

function PaymentCard({ p, onDone }: { p: AdminPayment; onDone: () => void }) {
  const s = p.student;
  return (
    <li className="card flex flex-col gap-3 sm:flex-row" data-testid="payment">
      <ReceiptImage paymentId={p.id} />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-bold">{s.name}</p>
          <p className="text-xs text-hint">
            {s.username ? `@${s.username} · ` : ""}
            {formatDate(p.createdAt)}
          </p>
        </div>
        {s.phone && (
          <a
            href={`tel:${s.phone}`}
            className="flex w-fit items-center gap-1 text-sm font-semibold text-link"
          >
            <Phone size={14} /> {s.phone}
          </a>
        )}
        <p className="text-sm">
          <b>{p.planName}</b> · {formatSum(p.amountUzs)} soʻm
        </p>
        {p.payerNote && <p className="text-sm text-hint">Izoh: {p.payerNote}</p>}
        {p.activeUntil && <p className="text-sm text-success">Obuna: {formatDate(p.activeUntil)} gacha</p>}
        {p.status === "REJECTED" && p.reviewNote && (
          <p className="text-sm text-hint">Sabab: {p.reviewNote}</p>
        )}
        {p.status === "PENDING" && <Actions p={p} onDone={onDone} />}
      </div>
    </li>
  );
}

export function PaymentsPage() {
  const [status, setStatus] = useState<Status>("PENDING");
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["payments", status],
    queryFn: () => api.get<AdminPayment[]>(`/admin/payments?status=${status}`),
  });
  const done = () => qc.invalidateQueries({ queryKey: ["payments"] });

  return (
    <div className="space-y-4">
      <PageTitle title="Toʻlovlar" />
      <StatusTabs value={status} onChange={setStatus} />
      {list.isPending && <SkeletonList />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState title="Chek yoʻq" hint="Oʻquvchi ilovada tarif tanlab chek yuborsa, shu yerga tushadi" />
      )}
      <ul className="space-y-2">
        {list.data?.map((p) => (
          <PaymentCard key={p.id} p={p} onDone={done} />
        ))}
      </ul>
    </div>
  );
}
