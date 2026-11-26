import type { AdminStudentRow } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../ui";

/** Bloklash sabab bilan (T-187): sabab faqat ustozga ko'rinadi, o'quvchi ilovaga kira olmaydi */
export function BlockControl({ s }: { s: AdminStudentRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: (blocked: boolean) =>
      api.post(`/admin/students/${s.id}/block`, { blocked, reason: blocked ? reason.trim() || null : null }),
    onSuccess: () => {
      setOpen(false);
      setReason("");
      return Promise.all([
        qc.invalidateQueries({ queryKey: ["students"] }),
        qc.invalidateQueries({ queryKey: ["student", s.id] }),
      ]);
    },
  });
  if (s.blocked)
    return (
      <div className="space-y-2" data-testid="block-control">
        <p className="text-sm text-danger">
          Bloklangan{s.blockedReason ? `: ${s.blockedReason}` : ""}. Ilovaga kira olmaydi.
        </p>
        <Button variant="secondary" onClick={() => m.mutate(false)} busy={m.isPending}>
          Blokdan chiqarish
        </Button>
        {m.error && <p className="text-sm text-danger">{m.error.message}</p>}
      </div>
    );
  return (
    <div className="space-y-2" data-testid="block-control">
      {!open ? (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          Bloklash…
        </Button>
      ) : (
        <>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            placeholder="Sabab (faqat sizga koʻrinadi)"
            className="min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={() => m.mutate(true)} busy={m.isPending}>
              Bloklashni tasdiqlash
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
          </div>
        </>
      )}
      {m.error && <p className="text-sm text-danger">{m.error.message}</p>}
    </div>
  );
}
