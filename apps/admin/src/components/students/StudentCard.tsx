import { STUDENT_ACCESS, type AdminStudentRow, type StudentAccess } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { ACCESS_HINTS, ACCESS_LABELS, formatDate, paidLabel } from "../../lib/labels";
import { Badge, Button } from "../ui";

function AccessSelect(p: { value: StudentAccess; busy: boolean; onChange: (m: StudentAccess) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-hint">Kirish:</span>
      <select
        value={p.value}
        disabled={p.busy}
        onChange={(e) => p.onChange(e.target.value as StudentAccess)}
        className="min-h-11 rounded-xl border border-hint/25 bg-section px-3"
        title={ACCESS_HINTS[p.value]}
      >
        {STUDENT_ACCESS.map((m) => (
          <option key={m} value={m}>
            {ACCESS_LABELS[m]}
          </option>
        ))}
      </select>
    </label>
  );
}

function NameBlock({ s, link }: { s: AdminStudentRow; link: boolean }) {
  return (
    <div className="min-w-0">
      {link ? (
        <Link to={`/students/${s.id}`} className="font-bold text-link hover:underline">
          {s.fullName ?? s.telegramName}
        </Link>
      ) : (
        <p className="font-bold">{s.fullName ?? s.telegramName}</p>
      )}
      <p className="text-xs text-hint">
        {s.fullName ? `Telegram: ${s.telegramName}` : "Ismini hali yozmagan"}
        {s.username ? ` · @${s.username}` : ""}
      </p>
    </div>
  );
}

/** O'quvchi qatori: qabul qilish va kirish rejimi. Ro'yxatda ism karta sahifasiga havola (T-068) */
export function StudentCard({ s, link = false }: { s: AdminStudentRow; link?: boolean }) {
  const qc = useQueryClient();
  const done = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["students"] }),
      qc.invalidateQueries({ queryKey: ["student", s.id] }),
    ]);
  const accept = useMutation({
    mutationFn: () => api.post(`/admin/students/${s.id}/accept`),
    onSuccess: done,
  });
  const mode = useMutation({
    mutationFn: (accessMode: StudentAccess) => api.patch(`/admin/students/${s.id}`, { accessMode }),
    onSuccess: done,
  });
  const error = accept.error ?? mode.error;

  return (
    <li className="card space-y-3" data-testid="student">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <NameBlock s={s} link={link} />
        {s.acceptedAt ? <Badge tone="success">Qabul qilingan</Badge> : <Badge tone="brand">Yangi</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {s.phone ? (
          <a href={`tel:${s.phone}`} className="flex items-center gap-1 font-semibold text-link">
            <Phone size={14} /> {s.phone}
          </a>
        ) : (
          <span className="text-hint">Telefon yoʻq</span>
        )}
        {s.parentPhones.map((p) => (
          <a key={p} href={`tel:${p}`} className="flex items-center gap-1 font-semibold text-link">
            <Phone size={14} /> {p} <span className="font-normal text-hint">ota-ona</span>
          </a>
        ))}
        {s.groupName && <Badge>{s.groupName}</Badge>}
        {/* T-110: pullik rejimdagi qabul qilingan o'quvchining obunasi */}
        {s.acceptedAt && s.accessMode === "AUTO" && (
          <Badge tone={s.paidUntil ? "success" : "danger"}>{paidLabel(s.paidUntil)}</Badge>
        )}
        <span className="text-xs text-hint">Roʻyxatdan: {formatDate(s.createdAt)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!s.acceptedAt && (
          <Button onClick={() => accept.mutate()} busy={accept.isPending}>
            Qabul qilish
          </Button>
        )}
        <AccessSelect value={s.accessMode} busy={mode.isPending} onChange={(m) => mode.mutate(m)} />
      </div>
      {error && <p className="text-sm text-danger">{error.message}</p>}
    </li>
  );
}
