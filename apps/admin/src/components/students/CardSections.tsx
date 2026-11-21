import { ATTENDANCE_LABELS, type AdminStudentCard, type AttendanceStatus } from "@samarqand/shared";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import type { ReactNode } from "react";
import { formatDate, paidLabel } from "../../lib/labels";
import { fmtDay } from "../../lib/offline";

function Section({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section className="card space-y-2" data-testid={testId}>
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

const pct = (correct: number, of: number) => (of ? Math.round((correct / of) * 100) : 0);

const MODE_NOTE = {
  FREE: "Ustoz bepul ochgan: quyidagi qadamlar kirishga taʼsir qilmaydi",
  CLOSED: "Ustoz yopib qoʻygan: qadamlar bajarilsa ham kirish yopiq",
} as const;

/** Kirish qadamlari (BR-A04) va e'tibor sabablari (BR-R02) */
export function StatusSection({ c }: { c: AdminStudentCard }) {
  const steps = [
    { ok: c.access.accepted, label: "Ustoz qabul qildi" },
    { ok: c.access.parentApproved, label: "Ota-ona tasdiqladi" },
    {
      ok: c.access.paid,
      label: paidLabel(c.paidUntil),
    },
  ];
  return (
    <Section title="Holat" testId="card-status">
      <p className="text-sm font-semibold">{c.access.full ? "Toʻliq kirish ochiq" : "Toʻliq kirish yopiq"}</p>
      {/* T-113: qo'lda rejimda qadamlar kirishni hal qilmaydi (BR-A04) */}
      {c.access.mode !== "AUTO" && <p className="text-xs text-hint">{MODE_NOTE[c.access.mode]}</p>}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-1">
            {s.ok ? (
              <CheckCircle2 size={14} className="text-success" />
            ) : (
              <Circle size={14} className="text-hint" />
            )}
            {s.label}
          </li>
        ))}
      </ul>
      {c.reasons.map((r) => (
        <p key={r.code} className="flex items-center gap-2 text-sm text-danger">
          <AlertTriangle size={14} className="shrink-0" /> {r.text}
        </p>
      ))}
    </Section>
  );
}

/** Mavzu testlari va kuchsiz mavzular (BR-R01) */
export function StudySection({ c }: { c: AdminStudentCard }) {
  const avg = c.stats.averagePercent;
  return (
    <Section title="Mavzu testlari" testId="card-study">
      <p className="text-sm">
        {c.stats.tests} ta test{avg === null ? "" : `, oʻrtacha ${avg}%`}
      </p>
      {c.weak.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-hint">Kuchsiz mavzular</p>
          {c.weak.map((w) => (
            <p key={w.topicId} className="text-sm">
              <span className="font-semibold">{w.topicTitle}</span>: {w.total} tadan {w.correct} toʻgʻri (
              {w.percent}%)
              {w.weakSkills.length > 0 && <span className="text-hint"> · {w.weakSkills.join(", ")}</span>}
            </p>
          ))}
        </div>
      )}
      {c.stats.recent.length > 0 && (
        <ul className="divide-y divide-hint/10 text-sm">
          {c.stats.recent.map((a) => (
            <li key={a.id} className="flex items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate">{a.topicTitle}</span>
              <span className="text-xs text-hint">{formatDate(a.submittedAt)}</span>
              <span className="w-16 text-right font-bold tabular-nums">
                {a.correct}/{a.checkable} · {pct(a.correct, a.checkable)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

const DOT: Record<AttendanceStatus, string> = {
  PRESENT: "bg-success",
  LATE: "bg-brand",
  ABSENT: "bg-danger",
  EXCUSED: "bg-hint",
};

/** Guruh, davomat va ota-ona (T-065 ma'lumoti) */
export function SchoolSection({ c }: { c: AdminStudentCard }) {
  const { group, attendance, parents } = c.school;
  const count = (s: AttendanceStatus) => attendance.filter((a) => a.status === s).length;
  return (
    <Section title="Guruh va davomat" testId="card-school">
      <p className="text-sm">
        {group ? `${group.name}${group.schedule ? ` · ${group.schedule}` : ""}` : "Guruhsiz"}
      </p>
      {attendance.length > 0 && (
        <>
          <p className="text-sm">
            30 kun:{" "}
            {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const)
              .map((s) => `${ATTENDANCE_LABELS[s].toLowerCase()} ${count(s)}`)
              .join(", ")}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {[...attendance].reverse().map((a) => (
              <li
                key={a.date}
                title={`${fmtDay(a.date)}: ${ATTENDANCE_LABELS[a.status]}`}
                className={`h-3 w-3 rounded-full ${DOT[a.status]}`}
              />
            ))}
          </ul>
        </>
      )}
      <p className="text-sm text-hint">
        Ota-ona: {parents.approved} tasdiqlangan{parents.pending ? `, ${parents.pending} kutilmoqda` : ""}
      </p>
    </Section>
  );
}

/** Offline (qog'ozdagi) testlar (T-056) */
export function OfflineSection({ c }: { c: AdminStudentCard }) {
  if (!c.offline.length) return null;
  return (
    <Section title="Offline testlar" testId="card-offline">
      <ul className="divide-y divide-hint/10 text-sm">
        {c.offline.map((o) => (
          <li key={o.id} className="flex items-center gap-2 py-1.5">
            <span className="min-w-0 flex-1 truncate">{o.title}</span>
            <span className="text-xs text-hint">{fmtDay(o.date)}</span>
            <span className="font-bold tabular-nums">{o.total}</span>
            <span className="text-xs text-hint">
              {o.place}/{o.participants}-oʻrin
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
