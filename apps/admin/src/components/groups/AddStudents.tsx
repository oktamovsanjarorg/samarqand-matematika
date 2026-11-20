import type { AdminStudentRow } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../ui";

/** Qidirib o'quvchi qo'shish; boshqa guruhdagi o'quvchi shu guruhga ko'chadi */
export function AddStudents({ groupId, groupName }: { groupId: string; groupName: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const found = useQuery({
    queryKey: ["students", "all", q],
    queryFn: () => api.get<AdminStudentRow[]>(`/admin/students?filter=all&q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
  });
  const add = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/groups/${groupId}/students`, { userIds: [userId] }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
  const rows = found.data?.filter((s) => s.groupName !== groupName) ?? [];
  return (
    <section className="card space-y-2">
      <h2 className="font-bold">Oʻquvchi qoʻshish</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ism, username yoki telefon"
        aria-label="Oʻquvchini qidirish"
        className="min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm"
      />
      {found.data && rows.length === 0 && (
        <p className="text-sm text-hint">{found.data.length ? "Topilganlar shu guruhda" : "Topilmadi"}</p>
      )}
      <ul className="divide-y divide-hint/10">
        {rows.map((s) => (
          <li key={s.id} className="flex items-center gap-2 py-2" data-testid="candidate">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{s.fullName ?? s.telegramName}</p>
              <p className="text-xs text-hint">
                {s.groupName ? `Hozir: ${s.groupName}` : (s.phone ?? "Guruhsiz")}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => add.mutate(s.id)}
              busy={add.isPending && add.variables === s.id}
            >
              {s.groupName ? "Koʻchirish" : "Qoʻshish"}
            </Button>
          </li>
        ))}
      </ul>
      {add.error && <p className="text-sm text-danger">{add.error.message}</p>}
    </section>
  );
}
