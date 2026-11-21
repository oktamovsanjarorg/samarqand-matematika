import {
  AUDIT_ACTION_LABELS,
  AUDIT_SECTIONS,
  ROLE_LABELS,
  type AuditActor,
  type AuditRow,
  type AuditSection,
} from "@samarqand/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { MathText } from "../components/MathText";
import { Badge, Button, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { auditLink, useAudit, type AuditFilter } from "../lib/audit";

const field = "min-h-11 rounded-xl border border-hint/25 bg-section px-3 text-sm";
const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];
const TZ = "Asia/Tashkent";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const time = (iso: string) => new Date(iso).toLocaleTimeString("uz-UZ", { timeZone: TZ, timeStyle: "short" });

function dayLabel(key: string, now = new Date()): string {
  if (key === dayKey(now)) return "Bugun";
  if (key === dayKey(new Date(now.getTime() - 86_400_000))) return "Kecha";
  const [y, m, d] = key.split("-").map(Number);
  return `${d}-${MONTHS[(m ?? 1) - 1]}${y === now.getFullYear() ? "" : ` ${y}`}`;
}

/** Ketma-ket yozuvlar kun bo'yicha (Toshkent vaqti) */
function byDay(rows: AuditRow[]): [string, AuditRow[]][] {
  const out: [string, AuditRow[]][] = [];
  for (const r of rows) {
    const key = dayKey(new Date(r.at));
    const last = out.at(-1);
    if (last?.[0] === key) last[1].push(r);
    else out.push([key, [r]]);
  }
  return out;
}

function Row({ r }: { r: AuditRow }) {
  const link = auditLink(r);
  // O'z kirishida obyekt o'zi: nomi takrorlanmaydi
  const target = r.target && r.entityId !== r.actor?.id && (
    <MathText text={r.target} className="min-w-0 truncate text-sm" />
  );
  return (
    <li className="space-y-0.5 py-2.5" data-testid="audit-row">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 text-sm font-semibold">
          {AUDIT_ACTION_LABELS[r.action] ?? r.action}
        </span>
        <span className="text-xs tabular-nums text-hint">{time(r.at)}</span>
      </div>
      {link && target ? (
        <Link to={link} className="block text-link">
          {target}
        </Link>
      ) : (
        target
      )}
      <p className="flex items-center gap-1.5 text-xs text-hint">
        {r.actor?.name ?? "Tizim"}
        {r.actor && (
          <Badge tone={r.actor.role === "TEACHER" ? "brand" : "hint"}>{ROLE_LABELS[r.actor.role]}</Badge>
        )}
      </p>
    </li>
  );
}

function Filters({
  f,
  setF,
  actors,
}: {
  f: AuditFilter;
  setF: (f: AuditFilter) => void;
  actors: AuditActor[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={f.section}
        onChange={(e) => setF({ ...f, section: e.target.value as AuditSection | "" })}
        aria-label="Jurnal boʻlimi"
        className={field}
      >
        <option value="">Barcha boʻlimlar</option>
        {Object.entries(AUDIT_SECTIONS).map(([k, s]) => (
          <option key={k} value={k}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        value={f.actorId}
        onChange={(e) => setF({ ...f, actorId: e.target.value })}
        aria-label="Jurnal xodimi"
        className={field}
      >
        <option value="">Barcha xodimlar</option>
        {actors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Jurnal (T-075): kim, qachon, nima qildi. Faqat ustoz ko'radi */
export function AuditPage() {
  const [f, setF] = useState<AuditFilter>({ section: "", actorId: "" });
  const q = useAudit(f);
  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];
  return (
    <div className="space-y-4">
      <PageTitle title="Jurnal" />
      <p className="text-sm text-hint">Admin paneldagi oʻzgarishlar: kim, qachon va nima qildi.</p>
      <Filters f={f} setF={setF} actors={q.data?.pages[0]?.actors ?? []} />
      {q.isPending && <SkeletonList />}
      {q.isError && <ErrorState message={q.error.message} onRetry={() => q.refetch()} />}
      {q.isSuccess && rows.length === 0 && (
        <EmptyState title="Yozuv yoʻq" hint="Filtrni oʻzgartirib koʻring" />
      )}
      {byDay(rows).map(([key, list]) => (
        <section key={key} className="space-y-1.5">
          <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-hint">{dayLabel(key)}</h2>
          <ul className="card divide-y divide-hint/10 py-0">
            {list.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </ul>
        </section>
      ))}
      {q.hasNextPage && (
        <Button
          variant="secondary"
          busy={q.isFetchingNextPage}
          onClick={() => q.fetchNextPage()}
          className="w-full"
        >
          Yana yuklash
        </Button>
      )}
    </div>
  );
}
