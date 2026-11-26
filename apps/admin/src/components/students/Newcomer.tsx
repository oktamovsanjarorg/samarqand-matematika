import type { AdminGroupRow, AdminStudentRow } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/labels";
import { loadSession } from "../../lib/session";
import { Button } from "../ui";

function useActions(id: string) {
  const qc = useQueryClient();
  const done = () => void qc.invalidateQueries({ queryKey: ["students"] });
  const accept = useMutation({
    mutationFn: (groupId: string | null) => api.post(`/admin/students/${id}/accept`, { groupId }),
    onSuccess: done,
  });
  const block = useMutation({
    mutationFn: () => api.post(`/admin/students/${id}/block`, { blocked: true, reason: "Begona" }),
    onSuccess: done,
  });
  const remove = useMutation({ mutationFn: () => api.del(`/admin/students/${id}`), onSuccess: done });
  const busy = accept.isPending || block.isPending || remove.isPending;
  return { accept, block, remove, busy, error: accept.error ?? block.error ?? remove.error };
}

/** Botdan yangi kirgan o'quvchi: guruhga qo'shish, online qabul, bloklash yoki (ustoz) o'chirish */
export function Newcomer({ s, groups }: { s: AdminStudentRow; groups: AdminGroupRow[] }) {
  const teacher = loadSession()?.user.role === "TEACHER";
  const { accept, block, remove, busy, error } = useActions(s.id);
  const name = s.fullName ?? s.telegramName;
  return (
    <li className="card space-y-2" data-testid="newcomer">
      <div>
        <Link to={`/students/${s.id}`} className="font-bold text-link hover:underline">
          {name}
        </Link>
        <p className="text-xs text-hint">
          {[s.fullName ? null : "ismini hali yozmagan", s.phone, s.username && `@${s.username}`]
            .filter(Boolean)
            .join(" · ")}
          {` · kirgan ${formatDate(s.createdAt)}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {groups.length > 0 && (
          <select
            aria-label={`${name}: guruh`}
            defaultValue=""
            disabled={busy}
            onChange={(e) => e.target.value && accept.mutate(e.target.value)}
            className="min-h-11 rounded-xl border border-hint/25 bg-section px-3 text-sm"
          >
            <option value="">Guruhga qoʻshish…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        <Button
          variant="secondary"
          onClick={() => accept.mutate(null)}
          busy={accept.isPending}
          disabled={busy}
        >
          Online oʻquvchi
        </Button>
        <Button variant="ghost" onClick={() => block.mutate()} busy={block.isPending} disabled={busy}>
          Bloklash
        </Button>
        {teacher && (
          <Button variant="ghost" onClick={() => remove.mutate()} busy={remove.isPending} disabled={busy}>
            Oʻchirish
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error.message}</p>}
    </li>
  );
}
