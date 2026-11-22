import { TUTOR_MESSAGE_MAX } from "@samarqand/shared";
import { ImagePlus, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TutorDraft } from "../../lib/tutor";

/** Tanlangan rasmning ko'rinishi (hali yuborilmagan) */
function Preview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div
      className="relative h-20 w-20 overflow-hidden rounded-xl border border-hint/25"
      data-testid="tutor-preview"
    >
      {url && <img src={url} alt="Yuboriladigan rasm" className="h-full w-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Rasmni olib tashlash"
        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Rasm tanlash tugmasi (kamera yoki galereya) */
function PickPhoto({ disabled, onPick }: { disabled: boolean; onPick: (f: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Rasm tanlash"
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={disabled}
        aria-label="Rasm qoʻshish"
        className="tap grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-hint/25 text-brand disabled:opacity-50"
      >
        <ImagePlus size={20} />
      </button>
    </>
  );
}

/**
 * Xabar yozish (T-171: rasm bilan). Matn yoki rasm bo'lsa yuboriladi; yuborilgach tozalanadi,
 * xato bo'lsa matn va rasm qoladi.
 */
export function TutorComposer({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (d: TutorDraft) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const ready = (!!text.trim() || !!file) && !busy;
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        void onSend({ text: text.trim(), file }).then((ok) => {
          if (!ok) return;
          setText("");
          setFile(null);
        });
      }}
    >
      {file && <Preview file={file} onRemove={() => setFile(null)} />}
      <div className="flex items-end gap-2">
        <PickPhoto disabled={busy} onPick={setFile} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={TUTOR_MESSAGE_MAX}
          rows={2}
          placeholder={file ? "Rasm haqida yozing (ixtiyoriy)" : "Savolingni yoz yoki masala rasmini yubor"}
          aria-label="Yordamchiga xabar"
          className="min-h-11 flex-1 resize-none rounded-xl border border-hint/25 bg-section px-3 py-2 text-[15px]"
        />
        <button
          type="submit"
          disabled={!ready}
          aria-label="Yuborish"
          className="tap grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white disabled:opacity-50"
        >
          <SendHorizontal size={20} />
        </button>
      </div>
    </form>
  );
}
