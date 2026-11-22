import type { StartTutorInput, TutorMessageView } from "@samarqand/shared";
import { Bot } from "lucide-react";
import { usePhotoUrl } from "../../lib/photos";
import { tutorError, useTutor, type TutorDraft } from "../../lib/tutor";
import { MathText } from "../MathText";
import { TutorComposer } from "./TutorComposer";

/** O'quvchi yuborgan rasm (T-171): bosilsa to'liq o'lchamda ochiladi */
function SentPhoto({ id }: { id: string }) {
  const url = usePhotoUrl(id, `/tutor/photos/${id}`);
  if (!url) return <div className="skeleton h-32 w-32 rounded-xl" />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img
        src={url}
        alt="Yuborilgan rasm"
        className="max-h-56 rounded-xl object-contain"
        data-testid="tutor-photo"
      />
    </a>
  );
}

function Bubble({ m }: { m: Pick<TutorMessageView, "role" | "text" | "photoId"> }) {
  if (m.role === "USER")
    return (
      <li className="ml-auto flex max-w-[85%] flex-col items-end gap-1">
        {m.photoId && <SentPhoto id={m.photoId} />}
        {m.text && (
          <span className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-3 py-2 text-white">
            {m.text}
          </span>
        )}
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

function Messages({ items, pending }: { items: TutorMessageView[]; pending: TutorDraft | null }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((m) => (
        <Bubble key={m.id} m={m} />
      ))}
      {pending !== null && (
        <>
          <Bubble
            m={{
              role: "USER",
              text: pending.text || (pending.file ? "📷 Rasm yuborilmoqda" : ""),
              photoId: null,
            }}
          />
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
  const onSend = async (d: TutorDraft) => {
    await beforeSend?.().catch(() => undefined);
    return send.mutateAsync(d).then(
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
      {open && <TutorComposer busy={send.isPending} onSend={onSend} />}
      {chat.data && (
        <p className="text-xs text-hint">Bugun yana {chat.data.remaining} ta savol berish mumkin</p>
      )}
    </div>
  );
}
