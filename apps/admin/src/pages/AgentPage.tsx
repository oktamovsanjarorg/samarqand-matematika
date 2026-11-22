import { useState } from "react";
import { AgentComposer } from "../components/agent/AgentComposer";
import { AgentConfirm, AgentItems } from "../components/agent/AgentItems";
import { Button, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { useAgentChat, useAgentStatus } from "../lib/agent";

const EXAMPLES = [
  "Bugun nima ishlar kutyapti?",
  "Tekshirilmagan toʻlov cheklarini koʻrsat",
  "Algebra kursiga “Kasrlar” mavzusini qoʻsh",
  "Kasrlar mavzusiga 5 ta oson savol tuz",
];

/** AI agent (T-156): ustoz oddiy so'z bilan yozadi, agent panel amallarini bajaradi (o'zgartirish — tasdiq bilan) */
export function AgentPage() {
  const status = useAgentStatus();
  if (status.isPending) return <SkeletonList rows={2} />;
  if (status.isError) return <ErrorState message={status.error.message} onRetry={() => status.refetch()} />;
  return (
    <div className="space-y-4">
      <PageTitle title="AI agent" />
      {status.data.enabled ? (
        <Chat />
      ) : (
        <EmptyState
          title="AI oʻchiq"
          hint="Agent ishlashi uchun serverda AI kaliti sozlanishi kerak. Panelning qolgan qismi odatdagidek ishlaydi."
        />
      )}
    </div>
  );
}

function Chat() {
  const a = useAgentChat();
  const [text, setText] = useState("");
  const send = (message: string) => {
    if (!message.trim() || a.busy || a.pending) return;
    a.chat.mutate(message.trim(), { onSuccess: () => setText("") });
  };
  return (
    <>
      <p className="text-sm text-hint">
        Nima qilish kerakligini oddiy soʻz bilan yozing. Oʻzgartiradigan har bir amalni avval sizga koʻrsatadi
        va tasdiqlaganingizdan keyingina bajaradi.
      </p>
      {a.items.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <Button key={e} variant="secondary" onClick={() => send(e)}>
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
        text={text}
        setText={setText}
        locked={!!a.pending}
        busy={a.chat.isPending}
        onSend={send}
      />
      {a.items.length > 0 && (
        <Button variant="ghost" onClick={a.reset} disabled={a.busy}>
          Yangi suhbat
        </Button>
      )}
    </>
  );
}
