import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { Button } from "./ui";

export type Status = "PENDING" | "APPROVED" | "REJECTED";
const TABS: { status: Status; label: string }[] = [
  { status: "PENDING", label: "Kutilmoqda" },
  { status: "APPROVED", label: "Tasdiqlangan" },
  { status: "REJECTED", label: "Rad etilgan" },
];

/** Navbat sahifalari uchun holat tablari (ota-onalar, to'lovlar) */
export function StatusTabs({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-section p-1" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.status}
          type="button"
          role="tab"
          aria-selected={value === t.status}
          onClick={() => onChange(t.status)}
          className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold ${value === t.status ? "bg-brand text-white" : "text-hint"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Rad etish: sabab majburiy (kamida 3 belgi), u foydalanuvchiga yuboriladi */
export function RejectForm(p: { url: string; placeholder: string; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const reject = useMutation({ mutationFn: () => api.post(p.url, { reason }), onSuccess: p.onDone });
  return (
    <div className="space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={p.placeholder}
        aria-label="Rad etish sababi"
        rows={2}
        maxLength={300}
        className="w-full rounded-xl border border-hint/25 bg-section p-3 text-sm"
      />
      <Button
        variant="danger"
        onClick={() => reject.mutate()}
        busy={reject.isPending}
        disabled={reason.trim().length < 3}
      >
        Rad etishni tasdiqlash
      </Button>
      {reject.error && <p className="text-sm text-danger">{reject.error.message}</p>}
    </div>
  );
}
