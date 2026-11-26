import type { ChildOpenTest, ChildSummary, ChildView } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
  Lock,
  Target,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { formatDay } from "../../lib/me";
import { useChildren } from "../../lib/parent";
import { formatStamp } from "../../lib/time";
import { EmptyState } from "../states";

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-sm font-bold">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

const pct = (c: number, of: number) => (of ? Math.round((c / of) * 100) : 0);

function Attendance({ s }: { s: ChildSummary }) {
  const n = (st: string) => s.attendance.filter((a) => a.status === st).length;
  return (
    <Block
      icon={<Users size={16} className="text-brand" />}
      title={s.group ? s.group.name : "Guruhga biriktirilmagan"}
    >
      {s.attendance.length > 0 ? (
        <p className="text-sm">
          Oxirgi 30 kun: keldi {n("PRESENT")}, kechikdi {n("LATE")}, kelmadi {n("ABSENT")}
        </p>
      ) : (
        <p className="text-sm text-hint">Davomat hali belgilanmagan</p>
      )}
    </Block>
  );
}

const OPEN_STATUS: Record<ChildOpenTest["status"], { text: string; tone: string }> = {
  submitted: { text: "Topshirdi", tone: "text-success" },
  started: { text: "Boshlagan, hali topshirmagan", tone: "text-accent" },
  not_started: { text: "Hali boshlamagan", tone: "text-danger" },
};

/** Hozir ochiq testlar (T-138): muddatdan oldin eslatish uchun; ball oyna yopilgach (BR-W08) */
function OpenTests({ s }: { s: ChildSummary }) {
  if (s.open.length === 0) return null;
  return (
    <Block icon={<Clock size={16} className="text-accent" />} title="Hozir ochiq testlar">
      <ul className="divide-y divide-hint/10 text-sm">
        {s.open.map((t) => (
          <li key={t.id} className="space-y-0.5 py-1.5" data-testid="child-open-test">
            <p className="font-semibold">
              {t.kind === "mock" ? "Mock: " : "Haftalik: "}
              {t.title}
            </p>
            <p className="text-xs">
              <span className={`font-semibold ${OPEN_STATUS[t.status].tone}`}>
                {OPEN_STATUS[t.status].text}
              </span>
              <span className="text-hint"> · {formatStamp(t.closesAt)} gacha</span>
            </p>
          </li>
        ))}
      </ul>
    </Block>
  );
}

function Results({ s }: { s: ChildSummary }) {
  return (
    <Block icon={<ClipboardList size={16} className="text-brand" />} title="Natijalar">
      <p className="text-sm">
        Mavzu testlari: {s.tests} ta{s.averagePercent === null ? "" : `, oʻrtacha ${s.averagePercent}%`}
      </p>
      <ul className="divide-y divide-hint/10 text-sm">
        {s.weekly.map((w) => (
          <li key={w.id} className="flex items-center gap-2 py-1.5">
            <CalendarCheck size={14} className="shrink-0 text-hint" />
            <span className="min-w-0 flex-1 truncate">{w.title}</span>
            <span className="font-bold tabular-nums">
              {w.submitted ? `${w.score}/${w.total}` : "Topshirmagan"}
            </span>
          </li>
        ))}
        {s.mocks.map((m) => (
          <li key={m.id} className="flex items-center gap-2 py-1.5" data-testid="child-mock">
            <GraduationCap size={14} className="shrink-0 text-hint" />
            <span className="min-w-0 flex-1 truncate">{m.title}</span>
            <span className="font-bold tabular-nums">
              {m.scaled}/{m.scaleMax}
              {m.grade ? ` · ${m.grade}` : ""}
            </span>
            {m.approx && <span className="text-xs text-hint">taxminiy</span>}
          </li>
        ))}
        {s.recent.map((a) => (
          <li key={a.id} className="flex items-center gap-2 py-1.5">
            <span className="min-w-0 flex-1 truncate">{a.topicTitle}</span>
            <span className="text-xs text-hint">{formatDay(a.submittedAt)}</span>
            <span className="font-bold tabular-nums">{pct(a.correct, a.checkable)}%</span>
          </li>
        ))}
        {s.offline.map((o) => (
          <li key={o.id} className="flex items-center gap-2 py-1.5">
            <span className="min-w-0 flex-1 truncate">{o.title}</span>
            <span className="font-bold tabular-nums">
              {o.score}/{o.scaleMax}
              {o.grade ? ` · ${o.grade}` : ""} · {o.place}/{o.participants}-oʻrin
            </span>
          </li>
        ))}
      </ul>
    </Block>
  );
}

/** BR-A04: to'liq kirish holati va obuna muddati; yetishmayotgan qadam aniq yoziladi */
/** T-121: ota-ona chekni o'zi yuboradi (BR-B07) */
function PayLink({ studentId, renew }: { studentId: string; renew: boolean }) {
  return (
    <Link
      to={`/children/${studentId}/billing`}
      className="tap ml-6 flex min-h-11 w-fit items-center text-sm font-semibold text-link"
    >
      {renew ? "Obunani uzaytirish" : "Obunani toʻlash"}
    </Link>
  );
}

function Access({ a, studentId }: { a: ChildSummary["access"]; studentId: string }) {
  const missing = [
    !a.accepted && "ustoz qabul qilmagan",
    !a.parentApproved && "ota-ona tasdiqlanmagan",
    !a.paid && "obuna toʻlanmagan",
  ].filter(Boolean);
  if (a.full)
    return (
      <div data-testid="child-access">
        <p className="flex items-center gap-2 text-sm">
          <CheckCircle2 size={16} className="shrink-0 text-success" />
          {a.paidUntil
            ? `Obuna faol: ${formatStamp(a.paidUntil).split(",")[0]} gacha`
            : "Barcha darslar ochiq"}
        </p>
        {a.paidUntil && <PayLink studentId={studentId} renew />}
      </div>
    );
  return (
    <div className="space-y-1" data-testid="child-access">
      <p className="flex items-center gap-2 text-sm">
        <Lock size={16} className="shrink-0 text-danger" /> Pullik darslar yopiq: {missing.join(", ")}
      </p>
      {!a.paid && <PayLink studentId={studentId} renew={false} />}
    </div>
  );
}

function PendingCard({ c }: { c: ChildView }) {
  return (
    <section className="card space-y-1" data-testid="child-pending">
      <h2 className="text-lg font-extrabold">{c.name}</h2>
      <p className="flex items-center gap-2 text-sm text-hint">
        <Clock size={16} className="shrink-0" /> Ulanish soʻrovi ustoz tasdigʻini kutmoqda. Tasdiqlangach
        natijalar shu yerda chiqadi.
      </p>
    </section>
  );
}

function ChildCard({ c }: { c: ChildView }) {
  const q = useQuery({
    queryKey: ["child", c.studentId],
    queryFn: () => api<ChildSummary>(`/me/children/${c.studentId}`),
  });
  return (
    <section className="card space-y-4" data-testid="child">
      <h2 className="text-lg font-extrabold">{c.name}</h2>
      {q.isPending && <div className="skeleton h-24" aria-busy="true" />}
      {q.isError && <p className="text-sm text-danger">{q.error.message}</p>}
      {q.data && (
        <>
          <Access a={q.data.access} studentId={c.studentId} />
          <Attendance s={q.data} />
          <OpenTests s={q.data} />
          <Results s={q.data} />
          {q.data.weak.length > 0 && (
            <Block icon={<Target size={16} className="text-danger" />} title="Takrorlash kerak">
              {q.data.weak.map((w) => (
                <p key={w.topicTitle} className="text-sm">
                  {w.topicTitle}: {w.total} ta savoldan {w.percent}% toʻgʻri
                </p>
              ))}
            </Block>
          )}
        </>
      )}
    </section>
  );
}

/** Ota-ona kabineti (T-069): tasdiqlangan farzandlar va ularning faktli holati */
export function ParentHome() {
  const children = useChildren();
  if (children.isPending) return <div className="skeleton h-40" aria-busy="true" />;
  if (!children.data?.length)
    return (
      <EmptyState
        title="Farzand hali ulanmagan"
        hint="Farzandingiz botga /ota yuborib, havolani sizga joʻnatadi. Ustoz tasdiqlagach natijalar shu yerda chiqadi."
      />
    );
  return (
    <div className="space-y-4">
      {children.data.map((c) =>
        c.status === "APPROVED" ? (
          <ChildCard key={c.studentId} c={c} />
        ) : (
          <PendingCard key={c.studentId} c={c} />
        ),
      )}
    </div>
  );
}
