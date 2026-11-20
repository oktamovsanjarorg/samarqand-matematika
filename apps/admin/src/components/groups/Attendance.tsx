import { ATTENDANCE_STATUSES, type AttendanceSheet, type AttendanceStatus } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { ATTENDANCE_LABELS, tashkentToday } from "../../lib/groups";
import { Button } from "../ui";

type Draft = Record<string, AttendanceStatus>;
const TONE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-success text-white",
  LATE: "bg-accent text-white",
  ABSENT: "bg-danger text-white",
  EXCUSED: "bg-brand text-white",
};
const initial = (sheet: AttendanceSheet): Draft =>
  Object.fromEntries(sheet.rows.flatMap((r) => (r.status ? [[r.userId, r.status]] : [])));

function StatusPicker(p: {
  name: string;
  value?: AttendanceStatus;
  onChange: (s: AttendanceStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={p.name}>
      {ATTENDANCE_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={p.value === s}
          onClick={() => p.onChange(s)}
          className={`min-h-9 rounded-lg px-2 text-xs font-semibold ${p.value === s ? TONE[s] : "bg-hint/10 text-hint"}`}
        >
          {ATTENDANCE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

function Sheet({ groupId, sheet }: { groupId: string; sheet: AttendanceSheet }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => initial(sheet));
  const save = useMutation({
    mutationFn: () =>
      api.put<AttendanceSheet>(`/admin/groups/${groupId}/attendance`, {
        date: sheet.date,
        marks: Object.entries(draft).map(([userId, status]) => ({ userId, status })),
      }),
    onSuccess: (s) => qc.setQueryData(["attendance", groupId, sheet.date], s),
  });
  const allPresent = () =>
    setDraft(Object.fromEntries(sheet.rows.map((r) => [r.userId, draft[r.userId] ?? "PRESENT"])));
  const marked = Object.keys(draft).length;
  return (
    <>
      <ol className="divide-y divide-hint/10">
        {sheet.rows.map((r) => (
          <li
            key={r.userId}
            className="flex flex-wrap items-center justify-between gap-2 py-2"
            data-testid="attendance-row"
          >
            <span className="text-sm font-semibold">{r.name}</span>
            <StatusPicker
              name={r.name}
              value={draft[r.userId]}
              onChange={(s) => setDraft((d) => ({ ...d, [r.userId]: s }))}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => save.mutate()} busy={save.isPending} disabled={!marked}>
          Saqlash
        </Button>
        <Button variant="ghost" onClick={allPresent}>
          Qolganlar keldi
        </Button>
        {save.isSuccess && (
          <span className="text-sm text-success">
            Saqlandi. Kelmagan va kechikkanlarning ota-onasiga xabar boradi
          </span>
        )}
      </div>
      {save.error && <p className="text-sm text-danger">{save.error.message}</p>}
    </>
  );
}

/** Davomat (T-055): kun tanlanadi, har o'quvchiga holat; kelmagan va kechikkanning ota-onasiga xabar */
export function Attendance({ groupId }: { groupId: string }) {
  const today = tashkentToday();
  const [date, setDate] = useState(today);
  const sheet = useQuery({
    queryKey: ["attendance", groupId, date],
    queryFn: () => api.get<AttendanceSheet>(`/admin/groups/${groupId}/attendance?date=${date}`),
    enabled: !!date,
  });
  return (
    <section className="card space-y-2" data-testid="attendance">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Davomat</h2>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Sana"
          className="min-h-11 rounded-xl border border-hint/25 bg-section px-3 text-sm"
        />
      </div>
      {sheet.data?.rows.length === 0 && <p className="text-sm text-hint">Guruhda oʻquvchi yoʻq</p>}
      {sheet.data && sheet.data.rows.length > 0 && <Sheet key={date} groupId={groupId} sheet={sheet.data} />}
      {sheet.error && <p className="text-sm text-danger">{sheet.error.message}</p>}
    </section>
  );
}
