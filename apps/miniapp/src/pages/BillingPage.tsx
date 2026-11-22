import { CheckCircle2, Clock } from "lucide-react";
import { PaymentHistory } from "../components/billing/PaymentHistory";
import { ReceiptForm } from "../components/billing/ReceiptForm";
import { ErrorState } from "../components/states";
import { useBackButton } from "../hooks/useBackButton";
import { useParams } from "react-router-dom";
import { billingBase, formatDate, useBilling } from "../lib/billing";

/** O'quvchining obunasi yoki ota-onaning farzand uchun to'lovi (T-121, BR-B07) */
export function BillingPage() {
  const { studentId } = useParams();
  const parent = !!studentId;
  const base = billingBase(studentId);
  useBackButton(parent ? "/" : "/profile");
  const billing = useBilling(base);
  if (billing.error) return <ErrorState message={billing.error.message} onRetry={() => billing.refetch()} />;
  if (!billing.data) return <div className="skeleton h-64" aria-busy="true" />;
  const v = billing.data;
  const pending = v.payments.some((p) => p.status === "PENDING");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">{parent ? "Farzand obunasi" : "Obuna"}</h1>
      {v.subscription && (
        <div className="card flex items-center gap-3" data-testid="active">
          <CheckCircle2 size={24} className="shrink-0 text-success" />
          <p className="text-[15px]">
            Obuna faol: <b>{formatDate(v.subscription.endsAt)}</b> gacha. Toʻlasangiz, shu sanadan uzayadi.
          </p>
        </div>
      )}
      {pending ? (
        <div className="card flex items-center gap-3" data-testid="pending">
          <Clock size={24} className="shrink-0 text-hint" />
          <p className="text-[15px]">Chekingiz tekshirilmoqda. Tasdiqlansa, bot orqali xabar keladi.</p>
        </div>
      ) : (
        <ReceiptForm view={v} base={base} />
      )}
      <PaymentHistory payments={v.payments} base={base} parent={parent} />
    </div>
  );
}
