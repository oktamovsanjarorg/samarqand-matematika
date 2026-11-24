import type { AgentItem, AgentPending } from "@samarqand/shared";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { plainText } from "../../lib/agent";
import { MathText } from "../MathText";
import { Button } from "../ui";

/** Suhbat: foydalanuvchi xabari, agent javobi va bajarilgan amallar */
export function AgentItems({ items, busy }: { items: AgentItem[]; busy: boolean }) {
  return (
    <ul className="flex flex-col gap-2" data-testid="agent-items" aria-live="polite">
      {items.map((m, i) => {
        if (m.kind === "user")
          return (
            <li
              key={i}
              className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-3 py-2 text-white"
            >
              {m.text}
            </li>
          );
        if (m.kind === "assistant")
          return (
            <li key={i} className="max-w-[92%] rounded-2xl rounded-bl-md bg-section px-3 py-2">
              <MathText text={plainText(m.text)} />
            </li>
          );
        return (
          <li key={i} className={`flex items-center gap-2 text-sm ${m.ok ? "text-success" : "text-danger"}`}>
            {m.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {m.title}
          </li>
        );
      })}
      {busy && (
        <li className="flex items-center gap-2 text-sm text-hint">
          <Loader2 size={16} className="animate-spin" /> AI ishlayapti…
        </li>
      )}
    </ul>
  );
}

/** Tasdiq: agent nima qilmoqchi; ustoz tasdiqlamaguncha hech narsa o'zgarmaydi */
export function AgentConfirm({
  pending,
  busy,
  onAnswer,
}: {
  pending: AgentPending;
  busy: boolean;
  onAnswer: (approve: boolean) => void;
}) {
  return (
    <section className="card space-y-3 border border-accent/40" aria-label="Tasdiq kutilmoqda">
      <p className="text-xs font-semibold text-hint">AI shu amalni bajarmoqchi</p>
      <p className="font-semibold">{pending.title}</p>
      {pending.lines.length > 0 && (
        <ul className="space-y-1 text-sm">
          {pending.lines.map((l, i) => (
            <li key={i} className="whitespace-pre-wrap">
              <MathText text={l} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button busy={busy} onClick={() => onAnswer(true)}>
          Tasdiqlash
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => onAnswer(false)}>
          Rad etish
        </Button>
      </div>
    </section>
  );
}
