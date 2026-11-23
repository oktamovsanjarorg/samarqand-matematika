import { Check, Users } from "lucide-react";
import { PARENTS } from "../content";

/** Sayt o'quvchi va ota-onalar uchun: xodim paneli haqida gap yo'q (T-174) */
export function Audience() {
  return (
    <div className="wrap py-16">
      <section id="ota-onalar" aria-labelledby="ota-onalar-h" className="card space-y-4 p-6 md:p-8">
        <h2 id="ota-onalar-h" className="flex items-center gap-3 text-2xl font-extrabold">
          <Users size={26} className="text-brand" aria-hidden /> Ota-onalar uchun
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {PARENTS.map((t) => (
            <li key={t} className="flex gap-2">
              <Check size={20} className="mt-0.5 shrink-0 text-success" aria-hidden /> {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
