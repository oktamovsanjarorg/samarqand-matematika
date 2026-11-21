import { formatSum, type AdminStudentCard, type PaymentStatus } from "@samarqand/shared";
import { Link } from "react-router-dom";
import { formatDate } from "../../lib/labels";
import { Badge } from "../ui";

const PAYMENT: Record<PaymentStatus, { label: string; tone: "accent" | "success" | "danger" }> = {
  PENDING: { label: "Kutilmoqda", tone: "accent" },
  APPROVED: { label: "Tasdiqlangan", tone: "success" },
  REJECTED: { label: "Rad etilgan", tone: "danger" },
};

/** Yopilgan haftalik testlar: ball va o'rin; topshirmagani ham ko'rinadi (T-111) */
export function WeeklySection({ c }: { c: AdminStudentCard }) {
  if (!c.weekly.length) return null;
  return (
    <section className="card space-y-2" data-testid="card-weekly">
      <h2 className="font-bold">Haftalik testlar</h2>
      <ul className="divide-y divide-hint/10 text-sm">
        {c.weekly.map((w) => (
          <li key={w.id} className="flex items-center gap-2 py-1.5">
            <Link to={`/weekly/${w.id}`} className="min-w-0 flex-1 truncate font-semibold text-link">
              {w.title}
            </Link>
            {w.submitted ? (
              <>
                <span className="font-bold tabular-nums">
                  {w.score}/{w.total}
                </span>
                <span className="text-xs text-hint">
                  {w.place}/{w.participants}-oʻrin
                </span>
              </>
            ) : (
              <Badge tone="danger">Topshirmagan</Badge>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Oxirgi cheklar: holati, rad etilgan bo'lsa sababi (T-111) */
export function PaymentsSection({ c }: { c: AdminStudentCard }) {
  if (!c.payments.length) return null;
  return (
    <section className="card space-y-2" data-testid="card-payments">
      <h2 className="font-bold">Toʻlovlar</h2>
      <ul className="divide-y divide-hint/10 text-sm">
        {c.payments.map((p) => (
          <li key={p.id} className="space-y-0.5 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate">
                {p.planName} · {formatSum(p.amountUzs)} soʻm
              </span>
              <Badge tone={PAYMENT[p.status].tone}>{PAYMENT[p.status].label}</Badge>
            </div>
            <p className="text-xs text-hint">
              {formatDate(p.createdAt)}
              {p.reviewNote ? ` · Sabab: ${p.reviewNote}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
