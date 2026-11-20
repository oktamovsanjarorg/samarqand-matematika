import { groupInput } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { useGroups } from "../lib/groups";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

function NewGroup() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("");
  const input = { name, schedule: schedule.trim() || null };
  const create = useMutation({
    mutationFn: () => api.post("/admin/groups", input),
    onSuccess: () => {
      setName("");
      setSchedule("");
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
  return (
    <section className="card grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Guruh nomi"
        aria-label="Guruh nomi"
        className={field}
      />
      <input
        value={schedule}
        onChange={(e) => setSchedule(e.target.value)}
        placeholder="Jadval, masalan: Du/Chor/Ju 14:00"
        aria-label="Jadval"
        className={field}
      />
      <Button
        onClick={() => create.mutate()}
        busy={create.isPending}
        disabled={!groupInput.safeParse(input).success}
      >
        Qoʻshish
      </Button>
      {create.error && <p className="text-sm text-danger sm:col-span-3">{create.error.message}</p>}
    </section>
  );
}

/** Offline guruhlar (T-054): ro'yxat va yangi guruh */
export function GroupsPage() {
  const list = useGroups();
  return (
    <div className="space-y-4">
      <PageTitle title="Guruhlar" />
      <NewGroup />
      {list.isPending && <SkeletonList rows={3} />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && <EmptyState title="Guruh yoʻq" hint="Offline darslar guruhini qoʻshing" />}
      <ul className="space-y-2">
        {list.data?.map((g) => (
          <li key={g.id}>
            <Link to={`/groups/${g.id}`} className="tap card flex items-center gap-3" data-testid="group">
              <UsersRound size={24} className={g.isActive ? "text-brand" : "text-hint"} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{g.name}</p>
                <p className="text-sm text-hint">
                  {g.schedule ?? "Jadval yozilmagan"} · {g.studentCount} oʻquvchi
                </p>
              </div>
              {!g.isActive && <Badge>Faol emas</Badge>}
              <ChevronRight size={18} className="text-hint" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
