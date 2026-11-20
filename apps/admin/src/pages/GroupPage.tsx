import type { AdminGroupDetail } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AddStudents } from "../components/groups/AddStudents";
import { Button, ErrorState, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { useGroup } from "../lib/groups";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

/** Guruh o'zgarganda ro'yxat va sahifa yangilanadi */
function useRefresh() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["groups"] });
}

function Settings({ g }: { g: AdminGroupDetail }) {
  const [name, setName] = useState(g.name);
  const [schedule, setSchedule] = useState(g.schedule ?? "");
  const onSuccess = useRefresh();
  const save = useMutation({
    mutationFn: () => api.patch(`/admin/groups/${g.id}`, { name, schedule: schedule.trim() || null }),
    onSuccess,
  });
  const toggle = useMutation({
    mutationFn: () => api.patch(`/admin/groups/${g.id}`, { isActive: !g.isActive }),
    onSuccess,
  });
  return (
    <section className="card space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Guruh nomi"
          className={field}
        />
        <input
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="Jadval"
          aria-label="Jadval"
          className={field}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save.mutate()} busy={save.isPending}>
          Saqlash
        </Button>
        <Button variant="ghost" onClick={() => toggle.mutate()} busy={toggle.isPending}>
          {g.isActive ? "Faol emas deb belgilash" : "Faollashtirish"}
        </Button>
      </div>
      {(save.error ?? toggle.error) && (
        <p className="text-sm text-danger">{(save.error ?? toggle.error)?.message}</p>
      )}
    </section>
  );
}

function Members({ g }: { g: AdminGroupDetail }) {
  const remove = useMutation({
    mutationFn: (userId: string) => api.del(`/admin/groups/${g.id}/students/${userId}`),
    onSuccess: useRefresh(),
  });
  return (
    <section className="card space-y-2" data-testid="members">
      <h2 className="font-bold">Oʻquvchilar ({g.students.length})</h2>
      {g.students.length === 0 && <p className="text-sm text-hint">Hali oʻquvchi yoʻq</p>}
      <ol className="divide-y divide-hint/10">
        {g.students.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 py-2 text-sm">
            <span className="w-6 text-hint">{i + 1}</span>
            <span className="min-w-0 flex-1 font-semibold">{s.name}</span>
            <span className="text-xs text-hint">{s.phone ?? ""}</span>
            <button
              type="button"
              onClick={() => remove.mutate(s.id)}
              aria-label={`${s.name}ni guruhdan chiqarish`}
              className="flex h-9 w-9 items-center justify-center text-hint"
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function GroupPage() {
  const { id = "" } = useParams();
  const g = useGroup(id);
  return (
    <div className="space-y-4">
      <Link to="/groups" className="flex w-fit items-center gap-1 text-sm font-semibold text-link">
        <ArrowLeft size={16} /> Guruhlar
      </Link>
      {g.isPending && <SkeletonList rows={3} />}
      {g.isError && <ErrorState message={g.error.message} onRetry={() => g.refetch()} />}
      {g.data && (
        <>
          <h1 className="text-xl font-extrabold">{g.data.name}</h1>
          <Settings key={`${g.data.name}${g.data.schedule}`} g={g.data} />
          <Members g={g.data} />
          <AddStudents groupId={g.data.id} groupName={g.data.name} />
        </>
      )}
    </div>
  );
}
