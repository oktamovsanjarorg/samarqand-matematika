import { TUTOR_MESSAGE_MAX, type StartTutorInput, type TutorMessageView } from "@samarqand/shared";
import { Bot, SendHorizontal } from "lucide-react";
import { useState } from "react";
import { tutorError, useTutor } from "../../lib/tutor";
import { MathText } from "../MathText";

function Bubble({ m }: { m: Pick<TutorMessageView, "role" | "text"> }) {
  if (m.role === "USER")
    return (
      <li className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-3 py-2 text-white">
        {m.text}
      </li>
    );
  return (
    <li className="max-w-[92%] rounded-2xl rounded-bl-md bg-hint/10 px-3 py-2" data-testid="tutor-reply">
      <MathText text={m.text} />
    </li>
  );
}

const INTRO: Record<StartTutorInput["mode"], string> = {
  PRACTICE: "Qayerda qiynalyapsan? Yordamchi javobni aytmaydi: ishora beradi, sen oʻzing yechasan.",
  REVIEW: "Xatoni birga koʻrib chiqamiz.",
  FREE: "Matematikadan savol yoz. Masala boʻlsa, avval oʻzing nima qilib koʻrganingni ayt.",
};

/** Xabar yozish: yuborilgach tozalanadi, xato bo'lsa matn qoladi */
function Composer({ busy, onSend }: { busy: boolean; onSend: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (t && !busy) void onSend(t).then((ok) => ok && setText(""));
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={TUTOR_MESSAGE_MAX}
        rows={2}
        placeholder="Savolingni yoz"
        aria-label="Yordamchiga xabar"
        className="min-h-11 flex-1 resize-none rounded-xl border border-hint/25 bg-section px-3 py-2 text-[15px]"
      />
      <button
        type="submit"
        disabled={!text.trim() || busy}
        aria-label="Yuborish"
        className="tap grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white disabled:opacity-50"
      >
        <SendHorizontal size={20} />
      </button>
    </form>
  );
}

function Messages({ items, pending }: { items: TutorMessageView[]; pending: string | null }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((m) => (
        <Bubble key={m.id} m={m} />
      ))}
      {pending !== null && (
        <>
          <Bubble m={{ role: "USER", text: pending }} />
          <li className="text-sm text-hint" aria-live="polite">
            Yordamchi yozmoqda…
          </li>
        </>
      )}
    </ul>
  );
}

/** Xato matni va yozish ochiqmi (limit tugasa yoki savol yopiq bo'lsa yopiladi) */
function chatState(remaining: number | undefined, failure: unknown) {
  const error = failure ? tutorError(failure) : null;
  return { error, open: remaining !== undefined && remaining > 0 && !error?.closed };
}

/**
 * Yordamchi bilan suhbat (PLAN §7). Rejim va kontekstni server belgilaydi;
 * beforeSend: mashqda yozilayotgan javob avval saqlanadi (yordamchi uni ko'rsin).
 */
export function TutorChat({
  input,
  beforeSend,
}: {
  input: StartTutorInput;
  beforeSend?: () => Promise<void>;
}) {
  const { chat, send } = useTutor(input);
  const { error, open } = chatState(chat.data?.remaining, chat.error ?? send.error);
  const onSend = async (t: string) => {
    await beforeSend?.().catch(() => undefined);
    return send.mutateAsync(t).then(
      () => true,
      () => false,
    );
  };

  return (
    <div className="space-y-3" data-testid="tutor">
      <p className="flex items-start gap-2 text-sm text-hint">
        <Bot size={18} className="mt-0.5 shrink-0 text-brand" /> {INTRO[input.mode]}
      </p>
      {chat.isPending && <div className="skeleton h-16" aria-busy="true" />}
      <Messages items={chat.data?.messages ?? []} pending={send.isPending ? send.variables : null} />
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error.text}
        </p>
      )}
      {open && <Composer busy={send.isPending} onSend={onSend} />}
      {chat.data && (
        <p className="text-xs text-hint">Bugun yana {chat.data.remaining} ta savol berish mumkin</p>
      )}
    </div>
  );
}
