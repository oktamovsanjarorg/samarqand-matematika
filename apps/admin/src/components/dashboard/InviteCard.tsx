import type { BotInvite } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Send } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../ui";

const SHARE_TEXT = "Samarqand matematika: darslar, testlar va natijalar. Botga kiring va /start bosing";

/** O'quvchilarni taklif qilish (T-143): bot havolasi, nusxa olish va Telegramʼda ulashish */
export function InviteCard() {
  const q = useQuery({
    queryKey: ["invite"],
    queryFn: () => api.get<BotInvite>("/admin/dashboard/invite"),
    staleTime: Infinity,
  });
  const [copied, setCopied] = useState(false);
  const link = q.data?.link;
  if (!link) return null;
  const copy = () => {
    void navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const share = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(SHARE_TEXT)}`;
  return (
    <section className="card space-y-3" aria-label="Oʻquvchilarni taklif qilish" data-testid="invite">
      <div>
        <h2 className="font-bold">Oʻquvchilarni taklif qilish</h2>
        <p className="text-sm text-hint">
          Havolani oʻquvchilarga yuboring: botda /start bosgach, ular «Oʻquvchilar» roʻyxatida paydo boʻladi
        </p>
      </div>
      <p className="break-all rounded-xl bg-hint/10 px-3 py-2 font-mono text-sm" data-testid="invite-link">
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
    </section>
  );
}
