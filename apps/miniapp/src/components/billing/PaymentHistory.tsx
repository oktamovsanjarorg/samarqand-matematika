import { formatSum, type MyPayment, type PaymentStatus } from "@samarqand/shared";
import { formatDate, useCancelPayment } from "../../lib/billing";

const STATUS: Record<PaymentStatus, { label: string; tone: string }> = {
  PENDING: { label: "Tekshirilmoqda", tone: "bg-hint/10 text-hint" },
  APPROVED: { label: "Tasdiqlandi", tone: "bg-success/10 text-success" },
  REJECTED: { label: "Rad etildi", tone: "bg-danger/10 text-danger" },
};

/** Kim yuborgani (T-121): ota-ona sahifasida farzand yuborgani, o'quvchida ota-ona yuborgani belgilanadi */
const by = (p: MyPayment, parent: boolean) =>
  parent ? (p.byParent ? null : "Farzandingiz yubordi") : p.byParent ? "Ota-onangiz yubordi" : null;

/** parent: ota-ona faqat o'zi yuborgan chekni bekor qiladi (BR-B07) */
export function PaymentHistory({
  payments,
  base,
  parent,
}: {
  payments: MyPayment[];
  base: string;
  parent: boolean;
}) {
  const cancel = useCancelPayment(base);
  if (payments.length === 0) return null;
  return (
    <section className="card space-y-3" data-testid="history">
      <h2 className="font-bold">Toʻlovlar</h2>
      <ul className="space-y-3">
        {payments.map((p) => (
          <li key={p.id} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1">
                <b>{p.planName}</b> · {formatSum(p.amountUzs)} soʻm
              </span>
              <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${STATUS[p.status].tone}`}>
                {STATUS[p.status].label}
              </span>
            </div>
            <p className="text-xs text-hint">
              {formatDate(p.createdAt)}
              {by(p, parent) && ` · ${by(p, parent)}`}
            </p>
            {p.reviewNote && <p className="text-sm text-danger">Sabab: {p.reviewNote}</p>}
            {p.status === "PENDING" && (!parent || p.byParent) && (
              <button
                type="button"
                onClick={() => cancel.mutate(p.id)}
                disabled={cancel.isPending}
                className="text-sm font-semibold text-link"
              >
                Chekni bekor qilish
              </button>
            )}
          </li>
        ))}
      </ul>
      {cancel.error && <p className="text-sm text-danger">{cancel.error.message}</p>}
    </section>
  );
}
