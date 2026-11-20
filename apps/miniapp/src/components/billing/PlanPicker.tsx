import { formatSum, type PlanView } from "@samarqand/shared";

export function PlanPicker(p: { plans: PlanView[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Tarif">
      {p.plans.map((plan) => {
        const on = plan.id === p.value;
        return (
          <button
            key={plan.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => p.onChange(plan.id)}
            className={`tap flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left ${on ? "border-brand bg-brand/5" : "border-hint/20 bg-section"}`}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{plan.name}</span>
              <span className="block text-xs text-hint">
                {plan.description ?? `${plan.durationDays} kun barcha darslar va testlar`}
              </span>
            </span>
            <span className="font-extrabold text-brand">{formatSum(plan.priceUzs)} soʻm</span>
          </button>
        );
      })}
    </div>
  );
}
