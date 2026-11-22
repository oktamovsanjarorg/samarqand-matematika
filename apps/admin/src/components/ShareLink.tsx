import { Check, Copy, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui";

/** Havola, "Nusxa olish" va "Telegramʼda ulashish" (T-143, T-155) */
export function ShareLink({ link, text, testId }: { link: string; text: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const share = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  return (
    <>
      <p className="break-all rounded-xl bg-hint/10 px-3 py-2 font-mono text-sm" data-testid={testId}>
        {link}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Nusxa olindi" : "Nusxa olish"}
        </Button>
        <a
          href={share}
          target="_blank"
          rel="noreferrer"
          className="tap inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"
        >
          <Send size={16} />
          Telegramʼda ulashish
        </a>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? "Havola nusxalandi" : ""}
      </p>
    </>
  );
}
