import type { AdminGroupDetail } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Button } from "../ui";

/** Guruhni o'chirish (T-188, faqat ustoz): oqibatlari tasdiqdan oldin aytiladi */
export function DeleteGroup({ g }: { g: AdminGroupDetail }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const del = useMutation({
    mutationFn: () => api.del(`/admin/groups/${g.id}`),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["groups"] }),
        qc.invalidateQueries({ queryKey: ["students"] }),
      ]);
      navigate("/groups", { replace: true });
    },
  });
  if (!open)
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Trash2 size={16} /> Guruhni oʻchirish
      </Button>
    );
  return (
    <div
      className="w-full space-y-2 rounded-xl border border-danger/40 bg-danger/5 p-3"
      data-testid="delete-group"
    >
      <p className="text-sm">
        «{g.name}» oʻchiriladi.{" "}
        {g.students.length > 0 && `${g.students.length} ta oʻquvchi guruhsiz (online) boʻlib qoladi. `}
        Guruh davomati tarixi ham oʻchadi. Offline test natijalari saqlanadi. Buni qaytarib boʻlmaydi.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" onClick={() => del.mutate()} busy={del.isPending}>
          Ha, oʻchirish
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Bekor qilish
        </Button>
      </div>
      {del.error && <p className="text-sm text-danger">{del.error.message}</p>}
    </div>
  );
}
