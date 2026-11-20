import { STUDENT_ACCESS, type AdminStudentRow, type StudentAccess } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { ACCESS_HINTS, ACCESS_LABELS, formatDate } from "../lib/labels";

type Filter = "new" | "all";

function AccessSelect(p: { value: StudentAccess; busy: boolean; onChange: (m: StudentAccess) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-hint">Kirish:</span>
      <select
        value={p.value}
        disabled={p.busy}
        onChange={(e) => p.onChange(e.target.value as StudentAccess)}
        className="min-h-11 rounded-xl border border-hint/25 bg-section px-3"
        title={ACCESS_HINTS[p.value]}
      >
        {STUDENT_ACCESS.map((m) => (
          <option key={m} value={m}>
            {ACCESS_LABELS[m]}
          </option>
        ))}
      </select>
    </label>
  );
}

function StudentCard({ s }: { s: AdminStudentRow }) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["students"] });
  const accept = useMutation({
    mutationFn: () => api.post(`/admin/students/${s.id}/accept`),
    onSuccess: done,
  });
  const mode = useMutation({
    mutationFn: (accessMode: StudentAccess) => api.patch(`/admin/students/${s.id}`, { accessMode }),
    onSuccess: done,
  });
  const error = accept.error ?? mode.error;

  return (
    <li className="card space-y-3" data-testid="student">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{s.fullName ?? s.telegramName}</p>
          <p className="text-xs text-hint">
            {s.fullName ? `Telegram: ${s.telegramName}` : "Ismini hali yozmagan"}
            {s.username ? ` · @${s.username}` : ""}
          </p>
        </div>
        {s.acceptedAt ? <Badge tone="success">Qabul qilingan</Badge> : <Badge tone="brand">Yangi</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {s.phone ? (
          <a href={`tel:${s.phone}`} className="flex items-center gap-1 font-semibold text-link">
            <Phone size={14} /> {s.phone}
          </a>
        ) : (
          <span className="text-hint">Telefon yoʻq</span>
        )}
        <span className="text-xs text-hint">Roʻyxatdan: {formatDate(s.createdAt)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!s.acceptedAt && (
          <Button onClick={() => accept.mutate()} busy={accept.isPending}>
            Qabul qilish
          </Button>
        )}
        <AccessSelect value={s.accessMode} busy={mode.isPending} onChange={(m) => mode.mutate(m)} />
      </div>
      {error && <p className="text-sm text-danger">{error.message}</p>}
    </li>
  );
}

export function StudentsPage() {
  const [filter, setFilter] = useState<Filter>("new");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const list = useQuery({
    queryKey: ["students", filter, query],
    queryFn: () =>
      api.get<AdminStudentRow[]>(`/admin/students?filter=${filter}&q=${encodeURIComponent(query)}`),
  });

  return (
    <div className="space-y-4">
      <PageTitle title="Oʻquvchilar">
        <div className="flex rounded-xl bg-section p-1" role="tablist">
          {(["new", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${filter === f ? "bg-brand text-white" : "text-hint"}`}
            >
              {f === "new" ? "Yangilar" : "Hammasi"}
            </button>
          ))}
        </div>
      </PageTitle>
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-hint/25 bg-section px-3">
        <Search size={16} className="text-hint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ism, username yoki telefon"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
      {list.isPending && <SkeletonList />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState
          title={filter === "new" ? "Yangi oʻquvchi yoʻq" : "Oʻquvchi topilmadi"}
          hint="Oʻquvchilar botdan ilovani ochganda shu yerda paydo boʻladi"
        />
      )}
      {list.data && list.data.length > 0 && (
        <ul className="space-y-2">
          {list.data.map((s) => (
            <StudentCard key={s.id} s={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
