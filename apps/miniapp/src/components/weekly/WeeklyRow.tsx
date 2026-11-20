import type { StudentWeeklyRow } from "@samarqand/shared";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatStamp, timeLeft } from "../../lib/time";

/** Qatordagi holat matni: o'quvchi nima qilishi kerakligini aytadi */
function stateText(t: StudentWeeklyRow, now: Date): string {
  if (t.status === "UPCOMING") return `Ochiladi: ${formatStamp(t.opensAt)}`;
  if (t.status === "CLOSED")
    return t.my.started
      ? `Natija: ${t.my.score ?? 0}/${t.questionCount}`
      : `Ishlanmagan · 0/${t.questionCount}`;
  if (t.my.submitted) return `Topshirildi · natija ${formatStamp(t.closesAt)} dan keyin`;
  return `${t.my.started ? "Davom ettiring" : "Ochiq"} · ${timeLeft(t.closesAt, now)} qoldi`;
}

export function WeeklyRow({ t, now, highlight }: { t: StudentWeeklyRow; now: Date; highlight?: boolean }) {
  const action = t.status === "OPEN" && !t.my.submitted;
  const body = (
    <>
      <CalendarCheck size={26} className={`shrink-0 ${action ? "text-brand" : "text-hint"}`} />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{t.title}</p>
        <p className="text-sm text-hint">{stateText(t, now)}</p>
      </div>
      {t.status !== "UPCOMING" && <ChevronRight size={20} className="text-hint" />}
    </>
  );
  const cls = `card flex items-center gap-3 ${highlight && action ? "border-2 border-brand/30" : ""}`;
  // Ochilmagan yoki ishlanmay yopilgan testda ochiladigan narsa yo'q
  if (t.status === "UPCOMING" || (t.status === "CLOSED" && !t.my.started))
    return (
      <div className={cls} data-testid="weekly-row">
        {body}
      </div>
    );
  return (
    <Link to={`/weekly/${t.id}`} className={`tap ${cls}`} data-testid="weekly-row">
      {body}
    </Link>
  );
}
