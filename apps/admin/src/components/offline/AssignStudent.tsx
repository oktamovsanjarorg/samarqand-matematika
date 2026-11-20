import type { AdminStudentRow } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../ui";

/** Moslanmagan qatorga o'quvchini qidirib biriktirish yoki biriktirilganini ajratish */
export function AssignStudent(p: {
  testId: string;
  resultId: string;
  userName: string | null;
  rowName: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const found = useQuery({
    queryKey: ["students", "all", q],
    queryFn: () => api.get<AdminStudentRow[]>(`/admin/students?filter=all&q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
  });
  const set = useMutation({
    mutationFn: (userId: string | null) =>
      api.patch(`/admin/offline-tests/${p.testId}/results/${p.resultId}`, { userId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["offline"] }),
  });
  if (p.userName)
    return (
      <span className="flex items-center gap-2">
        <span className="font-semibold text-success">{p.userName}</span>
        <button
          type="button"
          onClick={() => set.mutate(null)}
          className="text-xs text-hint underline"
          aria-label={`${p.rowName}: ajratish`}
        >
          ajratish
        </button>
      </span>
    );
  return (
    <div className="min-w-48 space-y-1">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Oʻquvchini qidiring"
        aria-label={`${p.rowName}: oʻquvchi`}
        className="min-h-9 w-full rounded-lg border border-hint/25 bg-section px-2 text-xs"
      />
      {found.data?.slice(0, 5).map((s) => (
        <Button
          key={s.id}
          variant="ghost"
          className="min-h-8 px-2 text-xs"
          onClick={() => set.mutate(s.id)}
          busy={set.isPending}
        >
          {s.fullName ?? s.telegramName}
          {s.phone ? ` · ${s.phone}` : ""}
        </Button>
      ))}
      {found.data?.length === 0 && <p className="text-xs text-hint">Topilmadi</p>}
      {set.error && <p className="text-xs text-danger">{set.error.message}</p>}
    </div>
  );
}
