import type { MyProfile } from "@samarqand/shared";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { Link } from "react-router-dom";

function Step({ done, title, hint }: { done: boolean; title: string; hint: string }) {
  return (
    <li className="flex gap-3">
      {done ? (
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" aria-label="Bajarilgan" />
      ) : (
        <Circle size={20} className="mt-0.5 shrink-0 text-hint" aria-label="Kutilmoqda" />
      )}
      <div>
        <p className={`text-[15px] ${done ? "" : "font-semibold"}`}>{title}</p>
        {!done && <p className="text-xs text-hint">{hint}</p>}
      </div>
    </li>
  );
}

/** BR-A04: to'liq kirish uchun qaysi qadam qolgani */
export function AccessCard({ access }: { access: MyProfile["access"] }) {
  if (access.full) return null;
  if (access.mode === "CLOSED")
    return (
      <div className="card flex items-center gap-3" data-testid="access">
        <Lock size={20} className="shrink-0 text-hint" />
        <p className="text-sm">Kirish ustoz tomonidan vaqtincha yopilgan. Savol boʻlsa, ustozga yozing.</p>
      </div>
    );
  return (
    <section className="card space-y-3" data-testid="access">
      <div>
        <h2 className="font-bold">Barcha darslarni ochish</h2>
        <p className="text-xs text-hint">Bepul darslar hozir ham ochiq</p>
      </div>
      <ol className="space-y-3">
        <Step
          done={access.accepted}
          title="Ustoz qabul qildi"
          hint="Ustoz roʻyxatni koʻrib chiqqach belgilanadi"
        />
        <Step
          done={access.parentApproved}
          title="Ota-ona tasdiqladi"
          hint="Botga /ota yuboring va kelgan havolani ota-onangizga joʻnating"
        />
        <Step done={access.paid} title="Obuna toʻlangan" hint="Kartaga oʻtkazib, chek rasmini yuboring" />
      </ol>
      {!access.paid && (
        <Link
          to="/billing"
          className="tap flex h-12 items-center justify-center rounded-xl bg-brand font-bold text-white"
        >
          Obunani toʻlash
        </Link>
      )}
    </section>
  );
}
