import type { BotInvite } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { ShareLink } from "../ShareLink";

const SHARE_TEXT = "Samarqand matematika: darslar, testlar va natijalar. Botga kiring va /start bosing";

/** O'quvchilarni taklif qilish (T-143): bot havolasi, nusxa olish va Telegramʼda ulashish */
export function InviteCard() {
  const q = useQuery({
    queryKey: ["invite"],
    queryFn: () => api.get<BotInvite>("/admin/dashboard/invite"),
    staleTime: Infinity,
  });
  const link = q.data?.link;
  if (!link) return null;
  return (
    <section className="card space-y-3" aria-label="Oʻquvchilarni taklif qilish" data-testid="invite">
      <div>
        <h2 className="font-bold">Oʻquvchilarni taklif qilish</h2>
        <p className="text-sm text-hint">
          Havolani oʻquvchilarga yuboring: botda /start bosgach, ular «Oʻquvchilar» roʻyxatida paydo boʻladi
        </p>
      </div>
      <ShareLink link={link} text={SHARE_TEXT} testId="invite-link" />
    </section>
  );
}
