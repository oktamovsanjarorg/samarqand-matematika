import type { AdminStudentRow } from "@samarqand/shared";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ACCESS_LABELS, formatDate, paidLabel } from "../../lib/labels";
import { Badge } from "../ui";

function Badges({ s }: { s: AdminStudentRow }) {
  const a = s.attendance30;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {s.blocked && <Badge tone="danger">bloklangan</Badge>}
      {!s.acceptedAt && <Badge tone="brand">yangi</Badge>}
      {!s.linked && <Badge tone="accent">Telegramʼga ulanmagan</Badge>}
      {s.accessMode !== "AUTO" && <Badge tone="accent">{ACCESS_LABELS[s.accessMode]}</Badge>}
      {s.parentPhones.length > 0 ? (
        <Badge tone="success">ota-ona ✓</Badge>
      ) : s.parentsPending > 0 ? (
        <Badge tone="brand">ota-ona kutilmoqda</Badge>
      ) : (
        <Badge>ota-ona yoʻq</Badge>
      )}
      {s.acceptedAt && s.accessMode === "AUTO" && (
        <Badge tone={s.paidUntil ? "success" : "danger"}>{paidLabel(s.paidUntil)}</Badge>
      )}
      {a.total > 0 && (
        <Badge tone={a.absent > a.total / 3 ? "danger" : "hint"}>{`davomat ${a.present}/${a.total}`}</Badge>
      )}
    </div>
  );
}

/** Ro'yxat qatori: ism, telefon, guruh, oxirgi kirgan va belgilar; bosilsa o'quvchi kartasi (T-185) */
export function StudentRow({ s, showGroup }: { s: AdminStudentRow; showGroup: boolean }) {
  const info = [s.phone, s.username && `@${s.username}`, showGroup && (s.groupName ?? "online")].filter(
    Boolean,
  );
  return (
    <li data-testid="student">
      <Link to={`/students/${s.id}`} className="tap flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="truncate font-semibold">{s.fullName ?? s.telegramName}</p>
          <p className="truncate text-xs text-hint">{info.join(" · ") || "maʼlumot yoʻq"}</p>
          <p className="truncate text-[11px] text-hint">
            {s.lastSeenAt
              ? `oxirgi kirgan ${formatDate(s.lastSeenAt)}`
              : `roʻyxatdan ${formatDate(s.createdAt)}`}
          </p>
        </div>
        <Badges s={s} />
        <ChevronRight size={18} className="text-hint" />
      </Link>
    </li>
  );
}
