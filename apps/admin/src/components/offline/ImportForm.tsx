import type { AdminOfflineTestDetail, OfflinePreview } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { tashkentToday, useGroups } from "../../lib/groups";
import { Badge, Button } from "../ui";
import { CsvPicker } from "../CsvPicker";
import { ScoresTable } from "./ScoresTable";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

function PreviewView({ p }: { p: OfflinePreview }) {
  const matched = p.rows.filter((r) => r.match).length;
  return (
    <div className="space-y-2" data-testid="offline-preview">
      {p.errors.map((e) => (
        <p key={`${e.line}${e.message}`} className="text-sm text-danger">
          {e.line ? `${e.line}-qator: ` : ""}
          {e.message}
        </p>
      ))}
      {p.rows.length > 0 && (
        <p className="text-sm">
          {p.rows.length} qator, {matched} tasi oʻquvchiga moslandi. Qolganini saqlagandan keyin biriktirasiz.
        </p>
      )}
      <ScoresTable
        sections={p.sections}
        rows={p.rows.map((r) => ({ ...r, key: String(r.line) }))}
        student={(r) => {
          const m = p.rows.find((x) => x.line === r.line)?.match;
          return m ? <Badge tone="success">{m.name}</Badge> : <Badge>Moslanmadi</Badge>;
        }}
      />
    </div>
  );
}

type Head = { title: string; date: string; groupId: string };

function HeadFields({ v, set }: { v: Head; set: (h: Head) => void }) {
  const groups = useGroups();
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <input
        value={v.title}
        onChange={(e) => set({ ...v, title: e.target.value })}
        placeholder="Test nomi"
        aria-label="Test nomi"
        className={field}
      />
      <input
        type="date"
        value={v.date}
        max={tashkentToday()}
        onChange={(e) => set({ ...v, date: e.target.value })}
        aria-label="Sana"
        className={field}
      />
      <select
        value={v.groupId}
        onChange={(e) => set({ ...v, groupId: e.target.value })}
        aria-label="Guruh"
        className={field}
      >
        <option value="">Guruhsiz</option>
        {groups.data?.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** CSV faylini tanlash → oldindan ko'rish → saqlash (T-056) */
export function ImportForm() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [head, setHead] = useState<Head>({ title: "", date: tashkentToday(), groupId: "" });
  const { title, date, groupId } = head;
  const [csv, setCsv] = useState("");
  const body = { csv, groupId: groupId || null };
  const preview = useMutation({
    mutationFn: () => api.post<OfflinePreview>("/admin/offline-tests/preview", body),
  });
  const save = useMutation({
    mutationFn: () => api.post<AdminOfflineTestDetail>("/admin/offline-tests", { ...body, title, date }),
    onSuccess: (t) => {
      void qc.invalidateQueries({ queryKey: ["offline"] });
      navigate(`/offline/${t.id}`);
    },
  });
  const onText = (text: string) => {
    setCsv(text);
    preview.reset();
  };
  const ok = preview.data && !preview.data.errors.length && preview.data.rows.length > 0;
  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Natijalarni yuklash</h2>
      <p className="text-sm text-hint">
        Excel jadvalini “CSV” qilib saqlang. Birinchi qator: ism ustuni (Ism yoki F.I.O), ixtiyoriy Telefon,
        qolgan ustunlar boʻlimlar.
      </p>
      <HeadFields v={head} set={setHead} />
      <CsvPicker onText={onText} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => preview.mutate()} busy={preview.isPending} disabled={!csv}>
          Tekshirish
        </Button>
        <Button onClick={() => save.mutate()} busy={save.isPending} disabled={!ok || title.trim().length < 2}>
          Saqlash
        </Button>
      </div>
      {(preview.error ?? save.error) && (
        <p className="text-sm text-danger">{(preview.error ?? save.error)?.message}</p>
      )}
      {preview.data && <PreviewView p={preview.data} />}
    </section>
  );
}
