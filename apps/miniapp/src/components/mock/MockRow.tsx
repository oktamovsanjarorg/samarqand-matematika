import type { StudentMockRow } from "@samarqand/shared";
import { ChevronRight, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { formatStamp, timeLeft } from "../../lib/time";

function stateText(t: StudentMockRow, now: Date): string {
  if (t.status === "UPCOMING") return `Ochiladi: ${formatStamp(t.opensAt)} · ${t.durationMin} daqiqa`;
  if (t.status === "CLOSED")
    return t.my.started
      ? `Natija: ${t.my.scaled ?? 0}${t.my.grade ? ` · ${t.my.grade}` : ""}`
      : "Ishlanmagan";
  if (t.my.submitted) return `Topshirildi · natija ${formatStamp(t.closesAt)} dan keyin`;
  if (t.my.started) return "Davom ettiring";
  return `${t.questionCount} savol · ${t.durationMin} daqiqa · ${timeLeft(t.closesAt, now)} ichida boshlang`;
}

export function MockRow({ t, now }: { t: StudentMockRow; now: Date }) {
  const action = t.status === "OPEN" && !t.my.submitted;
  const body = (
    <>
      <ClipboardList size={26} className={`shrink-0 ${action ? "text-brand" : "text-hint"}`} />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{t.title}</p>
        <p className="text-sm text-hint">{stateText(t, now)}</p>
      </div>
      {t.status !== "UPCOMING" && <ChevronRight size={20} className="text-hint" />}
    </>
  );
  if (t.status === "UPCOMING" || (t.status === "CLOSED" && !t.my.started))
    return (
      <div className="card flex items-center gap-3" data-testid="mock-row">
        {body}
      </div>
    );
  return (
    <Link to={`/mocks/${t.id}`} className="tap card flex items-center gap-3" data-testid="mock-row">
      {body}
    </Link>
  );
}
