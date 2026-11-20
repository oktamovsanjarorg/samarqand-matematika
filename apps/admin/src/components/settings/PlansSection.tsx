import { formatSum, planInput, type AdminPlan } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Badge, Button, EmptyState, SkeletonList } from "../ui";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

function NewPlan({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("30");
  const input = { name, priceUzs: Number(price.replace(/\s/g, "")), durationDays: Number(days) };
  const valid = planInput.safeParse(input).success;
  const create = useMutation({
    mutationFn: () => api.post("/admin/plans", input),
    onSuccess: () => {
      setName("");
      setPrice("");
      onDone();
    },
  });
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_9rem_6rem_auto] sm:items-end">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tarif nomi (masalan, Oylik)"
        aria-label="Tarif nomi"
        className={field}
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Narx, soʻm"
        aria-label="Narx"
        inputMode="numeric"
        className={field}
      />
      <input
        value={days}
        onChange={(e) => setDays(e.target.value)}
        aria-label="Muddat, kun"
        inputMode="numeric"
        className={field}
      />
      <Button onClick={() => create.mutate()} busy={create.isPending} disabled={!valid}>
        Qoʻshish
      </Button>
      <p className="text-xs text-hint sm:col-span-4">Narx soʻmda, muddat kunda (30 kun = bir oy)</p>
      {create.error && <p className="text-sm text-danger sm:col-span-4">{create.error.message}</p>}
    </div>
  );
}

function PlanRow({ plan, onDone }: { plan: AdminPlan; onDone: () => void }) {
  const toggle = useMutation({
    mutationFn: () => api.patch(`/admin/plans/${plan.id}`, { isActive: !plan.isActive }),
    onSuccess: onDone,
  });
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-hint/15 p-3" data-testid="plan">
      <div className="min-w-40 flex-1">
        <p className="font-bold">{plan.name}</p>
        <p className="text-sm text-hint">
          {formatSum(plan.priceUzs)} soʻm · {plan.durationDays} kun · faol obuna: {plan.activeCount}
        </p>
      </div>
      {!plan.isActive && <Badge>Yashirilgan</Badge>}
      <Button variant="secondary" onClick={() => toggle.mutate()} busy={toggle.isPending}>
        {plan.isActive ? "Yashirish" : "Koʻrsatish"}
      </Button>
    </li>
  );
}

/** Tariflar: o'quvchi faqat ko'rsatilganlarni tanlaydi. Narx o'zgarsa, eski cheklar o'z summasida qoladi */
export function PlansSection() {
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => api.get<AdminPlan[]>("/admin/plans") });
  const done = () => qc.invalidateQueries({ queryKey: ["plans"] });
  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Tariflar</h2>
      {plans.isPending && <SkeletonList rows={2} />}
      {plans.data?.length === 0 && (
        <EmptyState title="Tarif yoʻq" hint="Oʻquvchi toʻlov qilishi uchun kamida bitta tarif kerak" />
      )}
      <ul className="space-y-2">
        {plans.data?.map((p) => (
          <PlanRow key={p.id} plan={p} onDone={done} />
        ))}
      </ul>
      <NewPlan onDone={done} />
    </section>
  );
}
