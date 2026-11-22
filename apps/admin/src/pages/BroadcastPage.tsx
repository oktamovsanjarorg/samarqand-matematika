import {
  BROADCAST_AUDIENCE_LABELS,
  BROADCAST_AUDIENCES,
  type BroadcastAudience,
  type BroadcastResult,
} from "@samarqand/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { Button, PageTitle } from "../components/ui";
import { api } from "../lib/api";
import { useGroups } from "../lib/groups";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";
const MAX = 2000;

interface Target {
  audience: BroadcastAudience;
  groupId: string;
}

/** Qabul qiluvchilar soni: matnga bog'liq emas, shuning uchun soxta matn bilan dryRun */
function useRecipients(t: Target) {
  return useQuery({
    queryKey: ["broadcast-count", t.audience, t.groupId],
    queryFn: () =>
      api.post<BroadcastResult>("/admin/broadcast", {
        text: ".",
        audience: t.audience,
        groupId: t.groupId || null,
        dryRun: true,
      }),
  });
}

function TargetPicker({ value, onChange }: { value: Target; onChange: (t: Target) => void }) {
  const groups = useGroups();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <select
        value={value.audience}
        onChange={(e) => onChange({ ...value, audience: e.target.value as BroadcastAudience })}
        aria-label="Kimga"
        className={field}
      >
        {BROADCAST_AUDIENCES.map((a) => (
          <option key={a} value={a}>
            {BROADCAST_AUDIENCE_LABELS[a]}
          </option>
        ))}
      </select>
      <select
        value={value.groupId}
        onChange={(e) => onChange({ ...value, groupId: e.target.value })}
        aria-label="Guruh"
        className={field}
      >
        <option value="">Barcha guruhlar</option>
        {(groups.data ?? []).map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Ikki bosqich: "Yuborish" → "N kishiga yuboriladi" → "Ha, yuborish" */
function SendControls(p: { n: number; ready: boolean; busy: boolean; onSend: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <Button onClick={() => setConfirming(true)} disabled={!p.ready || p.n === 0}>
        <Send size={16} /> Yuborish
      </Button>
    );
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-accent/10 p-3">
      <p className="w-full text-sm font-semibold">{p.n} kishiga yuboriladi. Qaytarib boʻlmaydi.</p>
      <Button onClick={p.onSend} busy={p.busy}>
        <Send size={16} /> Ha, yuborish
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Bekor qilish
      </Button>
    </div>
  );
}

/** Ustozdan eʼlon (T-116): qabul qilingan o'quvchilar va tasdiqlangan ota-onalarga bot xabari */
export function BroadcastPage() {
  const [text, setText] = useState("");
  const [target, setTarget] = useState<Target>({ audience: "all", groupId: "" });
  const count = useRecipients(target);
  const n = count.data?.recipients ?? 0;
  const send = useMutation({
    mutationFn: () =>
      api.post<BroadcastResult>("/admin/broadcast", {
        text,
        audience: target.audience,
        groupId: target.groupId || null,
        dryRun: false,
      }),
    onSuccess: () => setText(""),
  });
  return (
    <div className="max-w-2xl space-y-4">
      <PageTitle title="Eʼlon yuborish" />
      <section className="card space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Eʼlon matni</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX}
            rows={5}
            placeholder="Masalan: Ertaga dars soat 15:00 da boshlanadi"
            className="w-full rounded-xl border border-hint/25 bg-section p-3 text-sm"
          />
          <span className="block text-right text-xs text-hint">
            {text.length}/{MAX}
          </span>
        </label>
        <TargetPicker value={target} onChange={setTarget} />
        <p className="text-sm text-hint" data-testid="broadcast-count">
          {count.isPending ? "Hisoblanmoqda…" : `${n} kishiga boradi`}: faqat qabul qilingan oʻquvchilar va
          tasdiqlangan ota-onalar
        </p>
        <SendControls
          key={send.data ? send.submittedAt : 0}
          n={n}
          ready={!!text.trim()}
          busy={send.isPending}
          onSend={() => send.mutate()}
        />
        {send.error && <p className="text-sm text-danger">{send.error.message}</p>}
        {send.data && (
          <p className="text-sm text-success" data-testid="broadcast-done">
            Yuborildi: {send.data.sent}/{send.data.recipients}. Botni bloklaganlarga xabar yetmaydi.
          </p>
        )}
      </section>
    </div>
  );
}
