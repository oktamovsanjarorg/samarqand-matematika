import type { ChildView } from "@samarqand/shared";
import { Bell, CheckCircle2, Clock, UserPlus } from "lucide-react";
import { useChildren } from "../../lib/parent";

function ChildRow({ c }: { c: ChildView }) {
  const ok = c.status === "APPROVED";
  return (
    <li className="flex items-center gap-2 py-2" data-testid="parent-child">
      <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
      <span
        className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${
          ok ? "bg-success/10 text-success" : "bg-hint/10 text-hint"
        }`}
      >
        {ok ? <CheckCircle2 size={12} /> : <Clock size={12} />}
        {ok ? "Tasdiqlangan" : "Kutilmoqda"}
      </span>
    </li>
  );
}

const NOTICES = [
  "Farzandingiz darsga kelmasa yoki kechiksa",
  "Haftalik test yopilganda: ball va oʻrin",
  "Mock imtihon yopilganda: ball va daraja",
  "Ulanish soʻrovi tasdiqlanganda yoki rad etilganda",
];

/** Ota-ona Profili (T-073): farzandlar, bot xabarlari va yana farzand ulash yo'li */
export function ParentProfile() {
  const children = useChildren().data ?? [];
  return (
    <>
      <section className="card space-y-1" data-testid="parent-children">
        <h2 className="font-bold">Farzandlarim</h2>
        {children.length > 0 ? (
          <ul className="divide-y divide-hint/10 text-sm">
            {children.map((c) => (
              <ChildRow key={c.studentId} c={c} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-hint">Hali ulanmagan</p>
        )}
      </section>
      <section className="card space-y-2" data-testid="parent-notices">
        <h2 className="flex items-center gap-2 font-bold">
          <Bell size={18} className="text-brand" /> Botdan keladigan xabarlar
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {NOTICES.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="text-xs text-hint">Xabarlar faqat ustoz tasdiqlagan farzand boʻyicha keladi.</p>
      </section>
      <section className="card space-y-2" data-testid="parent-add">
        <h2 className="flex items-center gap-2 font-bold">
          <UserPlus size={18} className="text-brand" /> Yana farzand ulash
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Farzandingiz botga /ota buyrugʻini yuboradi.</li>
          <li>Bot bergan havolani sizga joʻnatadi.</li>
          <li>Havolani ochib, telefon raqamingizni ulashasiz.</li>
          <li>Ustoz tasdiqlagach, farzand shu roʻyxatda chiqadi.</li>
        </ol>
      </section>
    </>
  );
}
