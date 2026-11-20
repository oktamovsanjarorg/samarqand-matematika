import { cardInput, type BillingCard } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Button, SkeletonList } from "../ui";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";
const groups = (n: string) => n.replace(/(\d{4})(?=\d)/g, "$1 ");

function Form({ initial }: { initial: BillingCard | null }) {
  const qc = useQueryClient();
  const [number, setNumber] = useState(initial ? groups(initial.number) : "");
  const [holder, setHolder] = useState(initial?.holder ?? "");
  const parsed = cardInput.safeParse({ number, holder });
  const save = useMutation({
    mutationFn: () => api.put<BillingCard>("/admin/billing-card", { number, holder }),
    onSuccess: (c) => qc.setQueryData(["billing-card"], { card: c }),
  });
  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-hint">Karta raqami</span>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="8600 0000 0000 0000"
          className={field}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-hint">Karta egasi</span>
        <input
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          autoComplete="off"
          className={field}
        />
      </label>
      <Button onClick={() => save.mutate()} busy={save.isPending} disabled={!parsed.success}>
        Kartani saqlash
      </Button>
      {save.isSuccess && <p className="text-sm text-success">Saqlandi</p>}
      {save.error && <p className="text-sm text-danger">{save.error.message}</p>}
    </div>
  );
}

/** O'quvchilar pul o'tkazadigan karta (BR-B01). Faqat ustoz ko'radi va o'zgartiradi */
export function CardForm() {
  const card = useQuery({
    queryKey: ["billing-card"],
    queryFn: () => api.get<{ card: BillingCard | null }>("/admin/billing-card"),
  });
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-bold">Toʻlov kartasi</h2>
        <p className="text-xs text-hint">Oʻquvchi ilovada shu raqamni koʻradi va chekni yuboradi</p>
      </div>
      {card.isPending ? <SkeletonList rows={2} /> : <Form initial={card.data?.card ?? null} />}
    </section>
  );
}
