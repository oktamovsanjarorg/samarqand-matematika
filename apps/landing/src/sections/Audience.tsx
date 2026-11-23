import { Check, type LucideIcon, Presentation, Users } from "lucide-react";
import type { ReactNode } from "react";
import { APP_URL, PARENTS, TEACHERS } from "../content";

function Panel(p: { id: string; Icon: LucideIcon; title: string; items: string[]; children?: ReactNode }) {
  return (
    <section id={p.id} aria-labelledby={`${p.id}-h`} className="card space-y-4 p-6">
      <h2 id={`${p.id}-h`} className="flex items-center gap-3 text-2xl font-extrabold">
        <p.Icon size={26} className="text-brand" aria-hidden /> {p.title}
      </h2>
      <ul className="space-y-2">
        {p.items.map((t) => (
          <li key={t} className="flex gap-2">
            <Check size={20} className="mt-0.5 shrink-0 text-success" aria-hidden /> {t}
          </li>
        ))}
      </ul>
      {p.children}
    </section>
  );
}

export function Audience() {
  return (
    <div className="wrap grid gap-4 py-16 md:grid-cols-2">
      <Panel id="ota-onalar" Icon={Users} title="Ota-onalar uchun" items={PARENTS} />
      <Panel id="ustozlar" Icon={Presentation} title="Ustoz va yordamchilar uchun" items={TEACHERS}>
        <a href={`${APP_URL}/admin/`} className="inline-block font-bold text-link underline">
          Boshqaruv paneliga kirish
        </a>
      </Panel>
    </div>
  );
}
