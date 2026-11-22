import { AlertTriangle } from "lucide-react";
import { formatDate } from "../../lib/labels";

/** Zaxira eskirgan (T-145): cron ishlamay qolgan bo'lishi mumkin, backup.sh o'zi xabar bera olmaydi */
export function BackupAlert({ since }: { since: string | null }) {
  if (!since) return null;
  return (
    <section className="card flex items-start gap-3 border border-danger/40" data-testid="backup-stale">
      <AlertTriangle size={22} className="mt-0.5 shrink-0 text-danger" />
      <div>
        <h2 className="font-bold">Zaxira nusxa olinmayapti</h2>
        <p className="text-sm text-hint">
          Oxirgi muvaffaqiyatli zaxira: {formatDate(since)}. Serverdagi kunlik zaxirani (cron) tekshiring yoki
          dasturchiga xabar bering.
        </p>
      </div>
    </section>
  );
}
