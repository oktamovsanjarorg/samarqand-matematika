import type { StartTutorInput } from "@samarqand/shared";
import { Bot, ChevronUp } from "lucide-react";
import { useState } from "react";
import { TutorChat } from "./TutorChat";

/**
 * Savol ostida yordamchi: mavzu testida ishora (BR-T02), haftalik natijada xato tahlili.
 * flush: mashqda yozilayotgan javob avval saqlanadi.
 */
export function TutorPanel(p: { input: StartTutorInput; label: string; flush?: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand/30 font-semibold text-brand"
      >
        <Bot size={18} /> {p.label}
      </button>
    );
  return (
    <div className="space-y-2 border-t border-hint/15 pt-3">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="flex items-center gap-1 text-sm font-semibold text-hint"
      >
        <ChevronUp size={16} /> Yordamchini yopish
      </button>
      <TutorChat input={p.input} beforeSend={p.flush} />
    </div>
  );
}
