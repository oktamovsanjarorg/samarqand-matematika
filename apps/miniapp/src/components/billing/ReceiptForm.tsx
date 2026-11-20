import type { BillingView } from "@samarqand/shared";
import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useSubmitReceipt } from "../../lib/billing";
import { CardBox } from "./CardBox";
import { PlanPicker } from "./PlanPicker";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 font-bold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function usePreview(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

/** Uch qadam: tarif → kartaga o'tkazish → chek rasmi (BR-B01) */
export function ReceiptForm({ view }: { view: BillingView }) {
  const [planId, setPlanId] = useState(view.plans[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const preview = usePreview(file);
  const submit = useSubmitReceipt();
  if (!view.card || view.plans.length === 0)
    return <p className="card text-sm text-hint">Toʻlov hali sozlanmagan. Ustozga murojaat qiling.</p>;

  return (
    <div className="card space-y-5">
      <Step n={1} title="Tarifni tanlang">
        <PlanPicker plans={view.plans} value={planId} onChange={setPlanId} />
      </Step>
      <Step n={2} title="Kartaga oʻtkazing">
        <CardBox card={view.card} />
      </Step>
      <Step n={3} title="Chek rasmini yuboring">
        <label className="tap flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-hint/30 p-3 text-sm font-semibold text-link">
          {preview ? (
            <img src={preview} alt="Tanlangan chek" className="max-h-48 rounded-lg" />
          ) : (
            <>
              <ImagePlus size={18} /> Chek rasmini tanlang
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Chek rasmi"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Izoh (ixtiyoriy): kimning kartasidan"
          className="h-12 w-full rounded-xl border border-hint/25 bg-section px-4 text-[15px]"
        />
      </Step>
      <button
        type="button"
        disabled={!file || !planId || submit.isPending}
        onClick={() => file && submit.mutate({ planId, file, note })}
        className="tap h-12 w-full rounded-xl bg-brand font-bold text-white disabled:opacity-50"
      >
        Chekni yuborish
      </button>
      {submit.error && (
        <p className="text-sm text-danger" role="alert">
          {submit.error.message}
        </p>
      )}
    </div>
  );
}
