import { ATTENDANCE_STATUSES, type AttendanceMonth, type AttendanceStatus } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { downloadCsv } from "../../lib/download";
import { ATTENDANCE_LABELS, tashkentToday } from "../../lib/groups";
import { ExportButton } from "../ExportButton";

/** Jadvaldagi qisqa belgi: + keldi, K kechikdi, Y yo'q (kelmadi), S sababli */
const SHORT: Record<AttendanceStatus, string> = { PRESENT: "+", LATE: "K", ABSENT: "Y", EXCUSED: "S" };
const TONE: Record<AttendanceStatus, string> = {
  PRESENT: "text-success",
  LATE: "text-accent",
  ABSENT: "text-danger",
  EXCUSED: "text-brand",
};
const day = (date: string) => date.slice(8);
const human = (date: string) => date.split("-").reverse().slice(0, 2).join(".");

function exportCsv(groupName: string, m: AttendanceMonth) {
  downloadCsv(`${groupName} davomat ${m.month}`, [
    ["Oʻquvchi", ...m.dates.map(human), ...ATTENDANCE_STATUSES.map((s) => ATTENDANCE_LABELS[s])],
    ...m.rows.map((r) => [
      r.left ? `${r.name} (guruhdan chiqqan)` : r.name,
      ...m.dates.map((d) => {
        const s = r.marks[d];
        return s ? ATTENDANCE_LABELS[s] : null;
      }),
      ...ATTENDANCE_STATUSES.map((s) => r.counts[s]),
    ]),
  ]);
}

function Grid({ m }: { m: AttendanceMonth }) {
  const cell = "border-b border-hint/10 px-1.5 py-2 text-center tabular-nums";
  return (
    <div className="overflow-x-auto" data-testid="attendance-month">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-hint">
            <th className="sticky left-0 bg-section px-2 py-2 text-left font-semibold">Oʻquvchi</th>
            {m.dates.map((d) => (
              <th key={d} className="px-1.5 py-2 font-semibold" title={human(d)}>
                {day(d)}
              </th>
            ))}
            {ATTENDANCE_STATUSES.map((s) => (
              <th key={s} className={`px-1.5 py-2 font-semibold ${TONE[s]}`} title={ATTENDANCE_LABELS[s]}>
                {SHORT[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r) => (
            <tr key={r.userId} data-testid="month-row">
              <th
                scope="row"
                className="sticky left-0 max-w-40 truncate border-b border-hint/10 bg-section px-2 py-2 text-left font-semibold"
              >
                {r.name}
                {r.left && <span className="block text-xs font-normal text-hint">guruhdan chiqqan</span>}
              </th>
              {m.dates.map((d) => {
                const s = r.marks[d];
                return (
                  <td key={d} className={`${cell} font-bold ${s ? TONE[s] : "text-hint"}`}>
                    {s ? (
                      <abbr title={ATTENDANCE_LABELS[s]} className="no-underline">
                        {SHORT[s]}
                      </abbr>
                    ) : (
                      "·"
                    )}
                  </td>
                );
              })}
              {ATTENDANCE_STATUSES.map((s) => (
                <td key={s} className={`${cell} bg-hint/5`}>
                  {r.counts[s]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Oylik davomat jadvali va Excel'ga yuklab olish (T-108) */
export function AttendanceMonthReport({ groupId, groupName }: { groupId: string; groupName: string }) {
  const current = tashkentToday().slice(0, 7);
  const [month, setMonth] = useState(current);
  const q = useQuery({
    queryKey: ["attendance-month", groupId, month],
    queryFn: () => api.get<AttendanceMonth>(`/admin/groups/${groupId}/attendance/month?month=${month}`),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });
  const m = q.data;
  return (
    <section className="card space-y-2" aria-label="Oylik davomat">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Oylik davomat</h2>
        <div className="flex items-center gap-1">
          {m && m.dates.length > 0 && <ExportButton onClick={() => exportCsv(groupName, m)} />}
          <input
            type="month"
            value={month}
            max={current}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Oy"
            className="min-h-11 rounded-xl border border-hint/25 bg-section px-3 text-sm"
          />
        </div>
      </div>
      {q.isPending && <div className="skeleton h-20" />}
      {q.error && <p className="text-sm text-danger">{q.error.message}</p>}
      {m && m.dates.length === 0 && <p className="text-sm text-hint">Bu oyda davomat belgilanmagan</p>}
      {m && m.dates.length > 0 && (
        <>
          <Grid m={m} />
          <p className="text-xs text-hint">
            {ATTENDANCE_STATUSES.map((s) => `${SHORT[s]} ${ATTENDANCE_LABELS[s].toLowerCase()}`).join(" · ")}
          </p>
        </>
      )}
    </section>
  );
}
