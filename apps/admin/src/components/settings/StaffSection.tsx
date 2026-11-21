import type { AdminStudentRow, StaffRow } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserMinus, UserPlus } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/labels";
import { Badge, Button, SkeletonList } from "../ui";

const studentName = (s: AdminStudentRow) => s.fullName ?? s.telegramName;

/** Ikki bosqichli olib tashlash: tasdiq 4 soniyadan keyin bekor bo'ladi */
function RemoveButton({ name, onRemove, busy }: { name: string; onRemove: () => void; busy: boolean }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);
  return confirm ? (
    <Button variant="danger" onClick={onRemove} busy={busy}>
      Olib tashlansinmi?
    </Button>
  ) : (
    <Button
      variant="secondary"
      onClick={() => setConfirm(true)}
      aria-label={`${name}: yordamchilikdan olish`}
    >
      <UserMinus size={16} /> Olish
    </Button>
  );
}

/** O'quvchilar ichidan qidirib yordamchi qilish */
function AddAssistant({ onAdd, busy }: { onAdd: (id: string) => void; busy: boolean }) {
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const found = useQuery({
    queryKey: ["students", "all", query],
    queryFn: () => api.get<AdminStudentRow[]>(`/admin/students?filter=all&q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
  return (
    <div className="space-y-2">
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-hint/25 bg-section px-3">
        <Search size={16} className="text-hint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Oʻquvchini qidiring: ism, username yoki telefon"
          aria-label="Yordamchi qidirish"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
      {query.length >= 2 && found.data?.length === 0 && <p className="text-sm text-hint">Topilmadi</p>}
      <ul className="space-y-1">
        {found.data?.slice(0, 5).map((s) => (
          <li key={s.id} className="flex items-center gap-2 rounded-lg p-2" data-testid="staff-candidate">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{studentName(s)}</p>
              {s.username && <p className="text-hint">@{s.username}</p>}
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                onAdd(s.id);
                setQ("");
              }}
              busy={busy}
            >
              <UserPlus size={16} /> Yordamchi qilish
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Yordamchilar (T-086): kontent, cheklar va tekshiruvni qiladi; tarif, karta va xodimlar faqat ustozda */
export function StaffSection() {
  const qc = useQueryClient();
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => api.get<StaffRow[]>("/admin/staff") });
  const opts = {
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["staff"] }),
        qc.invalidateQueries({ queryKey: ["students"] }),
      ]),
  };
  const add = useMutation({ mutationFn: (userId: string) => api.post("/admin/staff", { userId }), ...opts });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/admin/staff/${id}`), ...opts });
  const error = add.error ?? remove.error;
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-bold">Yordamchilar</h2>
        <p className="text-sm text-hint">
          Yordamchi kontent, savollar, cheklar va haftalik test tekshiruvini qila oladi. Tariflar, karta,
          jurnal va yordamchilar faqat ustozda. Yordamchi admin panelga botdagi /admin orqali kiradi.
        </p>
      </div>
      {staff.isPending && <SkeletonList rows={2} />}
      <ul className="space-y-2">
        {staff.data?.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-hint/15 p-3"
            data-testid="staff"
          >
            <div className="min-w-40 flex-1">
              <p className="font-bold">{r.name}</p>
              <p className="text-sm text-hint">
                {r.username ? `@${r.username} · ` : ""}
                {r.lastSeenAt ? `oxirgi kirish ${formatDate(r.lastSeenAt)}` : "hali kirmagan"}
              </p>
            </div>
            {r.role === "TEACHER" ? (
              <Badge tone="brand">Ustoz</Badge>
            ) : (
              <RemoveButton name={r.name} onRemove={() => remove.mutate(r.id)} busy={remove.isPending} />
            )}
          </li>
        ))}
      </ul>
      <AddAssistant onAdd={(id) => add.mutate(id)} busy={add.isPending} />
      {error && <p className="text-sm text-danger">{error.message}</p>}
    </section>
  );
}
