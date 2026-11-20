import { PARENT_FLAGS, type AdminParentLink, type ParentLinkStatus } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Phone } from "lucide-react";
import { useState } from "react";
import { RejectForm, StatusTabs } from "../components/ReviewParts";
import { Badge, Button, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { formatDate } from "../lib/labels";

function LinkCard({ link }: { link: AdminParentLink }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const done = () => qc.invalidateQueries({ queryKey: ["parent-links"] });
  const approve = useMutation({
    mutationFn: () => api.post(`/admin/parent-links/${link.id}/approve`),
    onSuccess: done,
  });

  return (
    <li className="card space-y-3" data-testid="parent-link">
      <div>
        <p className="font-bold">
          {link.parentName} <span className="text-hint">→</span> {link.studentName}
        </p>
        <p className="text-xs text-hint">
          {link.parentUsername ? `@${link.parentUsername} · ` : ""}
          {formatDate(link.createdAt)}
        </p>
      </div>
      <a href={`tel:${link.phone}`} className="flex w-fit items-center gap-1 text-sm font-semibold text-link">
        <Phone size={14} /> {link.phone}
      </a>
      {link.flags.length > 0 && (
        <ul className="space-y-1">
          {link.flags.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-danger">
              <AlertTriangle size={14} /> {PARENT_FLAGS[f]}
            </li>
          ))}
        </ul>
      )}
      {link.status === "REJECTED" && link.rejectReason && (
        <p className="text-sm text-hint">Sabab: {link.rejectReason}</p>
      )}
      {link.status === "PENDING" && (
        <div className="space-y-2">
          <p className="text-xs text-hint">
            Raqamga qoʻngʻiroq qilib, haqiqatan ota-onasi ekanini tekshiring.
          </p>
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
              url={`/admin/parent-links/${link.id}/reject`}
              placeholder="Sabab (ota-onaga yuboriladi)"
              onDone={done}
            />
          )}
          {approve.error && <p className="text-sm text-danger">{approve.error.message}</p>}
        </div>
      )}
    </li>
  );
}

export function ParentsPage() {
  const [status, setStatus] = useState<ParentLinkStatus>("PENDING");
  const list = useQuery({
    queryKey: ["parent-links", status],
    queryFn: () => api.get<AdminParentLink[]>(`/admin/parent-links?status=${status}`),
  });

  return (
    <div className="space-y-4">
      <PageTitle title="Ota-onalar" />
      <StatusTabs value={status} onChange={setStatus} />
      {list.isPending && <SkeletonList />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState
          title="Soʻrov yoʻq"
          hint="Oʻquvchi botda /ota yozib, havolani ota-onasiga yuboradi. Soʻrovlar shu yerga tushadi"
        />
      )}
      {list.data && list.data.length > 0 && (
        <ul className="space-y-2">
          {list.data.map((l) => (
            <LinkCard key={l.id} link={l} />
          ))}
        </ul>
      )}
      {status === "PENDING" && list.data?.some((l) => l.flags.length > 0) && (
        <Badge tone="danger">Shubha belgisi borlar roʻyxat boshida</Badge>
      )}
    </div>
  );
}
