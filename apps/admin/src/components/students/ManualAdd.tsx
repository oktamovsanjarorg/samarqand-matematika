import type { AdminGroupRow, StudentBulkResult } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../ui";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

function Result({ r }: { r: StudentBulkResult }) {
  return (
    <div className="space-y-1 text-sm" data-testid="manual-result">
      <p className="font-semibold text-success">{r.created.length} ta oʻquvchi qoʻshildi</p>
      {r.skipped.length > 0 && (
        <ul className="space-y-0.5 text-danger">
          {r.skipped.map((s) => (
            <li key={s.line}>
              {s.line}-qator «{s.text}»: {s.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GroupSelect(p: { groups: AdminGroupRow[]; value: string; onChange: (id: string) => void }) {
  return (
    <select value={p.value} onChange={(e) => p.onChange(e.target.value)} aria-label="Guruh" className={field}>
      <option value="">Guruhsiz (online)</option>
      {p.groups
        .filter((g) => g.isActive)
        .map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
    </select>
  );
}

/** O'quvchini qo'lda kiritish (T-186): botga kirib raqamini ulashganda avtomatik bog'lanadi */
export function ManualAdd({ groups }: { groups: AdminGroupRow[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [groupId, setGroupId] = useState("");
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: () => api.post<StudentBulkResult>("/admin/students/bulk", { text, groupId: groupId || null }),
    onSuccess: (r) => {
      if (!r.skipped.length) setText("");
      return Promise.all([
        qc.invalidateQueries({ queryKey: ["students"] }),
        qc.invalidateQueries({ queryKey: ["groups"] }),
      ]);
    },
  });
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus size={16} /> Oʻquvchi qoʻshish
      </Button>
    );
  return (
    <section className="card space-y-2" data-testid="manual-add">
      <h2 className="font-extrabold">Oʻquvchi qoʻshish</h2>
      <p className="text-xs text-hint">
        Har qatorga bitta oʻquvchi: «Ism Familiya, telefon». Oʻquvchi botga kirib shu raqamni ulashganda
        hisobiga avtomatik bogʻlanadi.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        aria-label="Oʻquvchilar roʻyxati"
        placeholder={"Aziz Karimov, 90 123 45 67\nLola Ergasheva, +998 93 765 43 21"}
        className={`${field} py-2`}
      />
      <GroupSelect groups={groups} value={groupId} onChange={setGroupId} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => add.mutate()} busy={add.isPending} disabled={!text.trim()}>
          Qoʻshish
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Yopish
        </Button>
      </div>
      {add.data && <Result r={add.data} />}
      {add.error && <p className="text-sm text-danger">{add.error.message}</p>}
    </section>
  );
}
