import { ATTENDANCE_LABELS, type AttendanceStatus, type MySchool } from "@samarqand/shared";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { formatDay } from "../../lib/me";

const DOT: Record<AttendanceStatus, string> = {
  PRESENT: "bg-success",
  LATE: "bg-brand",
  ABSENT: "bg-danger",
  EXCUSED: "bg-hint",
};

function ParentLine({ p }: { p: MySchool["parents"] }) {
  if (p.approved > 0)
    return (
      <p className="flex items-center gap-2 text-sm">
        <CheckCircle2 size={16} className="shrink-0 text-success" /> Ota-ona ulangan: natijalar ularga ham
        boradi
      </p>
    );
  if (p.pending > 0)
    return (
      <p className="flex items-center gap-2 text-sm">
        <Clock size={16} className="shrink-0 text-hint" /> Ota-ona soʻrovi ustoz tasdigʻini kutmoqda
      </p>
    );
  return (
    <p className="text-sm text-hint">
      Ota-ona ulanmagan. Botga /ota yuboring va havolani ota-onangizga joʻnating.
    </p>
  );
}

function Attendance({ rows }: { rows: MySchool["attendance"] }) {
  const count = (s: AttendanceStatus) => rows.filter((r) => r.status === s).length;
  return (
    <div className="space-y-2" data-testid="attendance">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span>Oxirgi 30 kun:</span>
        {(["PRESENT", "LATE", "ABSENT"] as const).map((st) => (
          <span key={st} className="flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${DOT[st]}`} aria-hidden />
            {ATTENDANCE_LABELS[st].toLowerCase()} {count(st)}
          </span>
        ))}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {[...rows].reverse().map((r) => (
          <li
            key={r.date}
            title={`${formatDay(r.date)}: ${ATTENDANCE_LABELS[r.status]}`}
            aria-label={`${formatDay(r.date)}: ${ATTENDANCE_LABELS[r.status]}`}
            className={`h-3 w-3 rounded-full ${DOT[r.status]}`}
          />
        ))}
      </ul>
    </div>
  );
}

/** Profil: offline guruh, ota-ona holati, davomat (T-065) */
export function SchoolCard({ s }: { s: MySchool }) {
  return (
    <section className="card space-y-3" data-testid="school">
      <div className="flex items-start gap-3">
        <Users size={20} className="mt-0.5 shrink-0 text-brand" />
        <div className="min-w-0">
          <p className="font-bold">{s.group ? s.group.name : "Guruhga biriktirilmagan"}</p>
          {s.group?.schedule && <p className="text-sm text-hint">{s.group.schedule}</p>}
        </div>
      </div>
      {s.attendance.length > 0 && <Attendance rows={s.attendance} />}
      <ParentLine p={s.parents} />
    </section>
  );
}
