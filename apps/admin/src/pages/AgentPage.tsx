import { AgentComposer } from "../components/agent/AgentComposer";
import { AgentConfirm, AgentItems } from "../components/agent/AgentItems";
import { Button, EmptyState, ErrorState, SkeletonList } from "../components/ui";
import { useAi, type AiContext } from "../lib/agent";

const EXAMPLES = [
  "Bugun nima ishlar kutyapti?",
  "Tekshirilmagan toʻlov cheklarini koʻrsat",
  "Oʻquvchilar koʻproq nimani soʻrayapti?",
  "Algebra kursiga “Kasrlar” mavzusini qoʻsh",
  "Kasrlar mavzusiga 5 ta oson savol tuz",
];

/** Buyruq va savol (T-156): ustoz oddiy so'z bilan yozadi, agent panel amallarini bajaradi (o'zgartirish — tasdiq bilan) */
export function AgentPage() {
  const { status, agent } = useAi();
  if (status.isPending) return <SkeletonList rows={2} />;
  if (status.isError) return <ErrorState message={status.error.message} onRetry={() => status.refetch()} />;
  if (!status.data.enabled)
    return (
      <EmptyState
        title="AI oʻchiq"
        hint="Buyruq berish uchun serverda AI kaliti sozlanishi kerak. Oʻquvchilar suhbatlari va panelning qolgan qismi odatdagidek ishlaydi."
      />
    );
  return <Chat a={agent} />;
}

function Chat({ a }: { a: AiContext["agent"] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-hint">
        Nima qilish kerakligini oddiy soʻz bilan yozing. Oʻzgartiradigan har bir amalni avval sizga koʻrsatadi
        va tasdiqlaganingizdan keyingina bajaradi.
      </p>
      {a.items.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <Button key={e} variant="secondary" onClick={() => a.send(e)}>
              {e}
            </Button>
          ))}
        </div>
      )}
      <AgentItems items={a.items} busy={a.busy} />
      {a.pending && (
        <AgentConfirm pending={a.pending} busy={a.confirm.isPending} onAnswer={a.confirm.mutate} />
      )}
      {a.error && (
        <p role="alert" className="text-sm text-danger">
          {a.error.message}
        </p>
      )}
      <AgentComposer
        text={a.text}
        setText={a.setText}
        locked={!!a.pending}
        busy={a.chat.isPending}
        onSend={a.send}
      />
      {a.items.length > 0 && (
        <Button variant="ghost" onClick={a.reset} disabled={a.busy}>
          Yangi suhbat
        </Button>
      )}
    </div>
  );
}
