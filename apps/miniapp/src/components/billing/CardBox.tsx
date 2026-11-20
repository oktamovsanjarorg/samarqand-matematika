import type { BillingCard } from "@samarqand/shared";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

const groups = (n: string) => n.replace(/(\d{4})(?=\d)/g, "$1 ");

/** Karta raqami nusxa olish tugmasi bilan (bank ilovasiga qo'yish uchun) */
export function CardBox({ card }: { card: BillingCard }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(card.number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-3 rounded-xl bg-brand p-4 text-white" data-testid="card">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-lg font-bold tracking-wider">{groups(card.number)}</p>
        <p className="text-sm opacity-80">{card.holder}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label="Karta raqamini nusxalash"
        className="tap flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </button>
    </div>
  );
}
