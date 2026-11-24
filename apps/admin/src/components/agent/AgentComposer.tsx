import { AGENT_MESSAGE_MAX } from "@samarqand/shared";
import { Send } from "lucide-react";
import { Button } from "../ui";

/** Xabar maydoni: Enter yuboradi, Shift+Enter yangi qator; tasdiq kutilayotganda yopiq */
export function AgentComposer(p: {
  text: string;
  setText: (v: string) => void;
  locked: boolean;
  busy: boolean;
  onSend: (text: string) => void;
}) {
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        p.onSend(p.text);
      }}
    >
      <textarea
        aria-label="AI yordamchiga xabar"
        value={p.text}
        maxLength={AGENT_MESSAGE_MAX}
        rows={3}
        disabled={p.locked}
        placeholder={
          p.locked ? "Avval amalni tasdiqlang yoki rad eting" : "Masalan: yangi oʻquvchilarni qabul qil"
        }
        onChange={(e) => p.setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            p.onSend(p.text);
          }
        }}
        className="min-h-11 flex-1 resize-y rounded-xl border border-hint/25 bg-section px-3 py-2"
      />
      <Button type="submit" aria-label="Yuborish" busy={p.busy} disabled={!p.text.trim() || p.locked}>
        <Send size={16} />
      </Button>
    </form>
  );
}
