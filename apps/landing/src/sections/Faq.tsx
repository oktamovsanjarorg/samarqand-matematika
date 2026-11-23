import { ChevronDown } from "lucide-react";
import { FAQ } from "../content";
import { BotButton } from "./BotButton";

export function Faq() {
  return (
    <section id="savollar" aria-labelledby="q-h" className="bg-surface py-16">
      <div className="wrap max-w-3xl space-y-6">
        <h2 id="q-h" className="text-3xl font-extrabold">
          Koʻp beriladigan savollar
        </h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="card group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {q}
                <ChevronDown size={20} className="shrink-0 transition group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 text-hint">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section className="wrap py-16">
      <div className="flex flex-col items-center gap-4 rounded-card bg-brand px-6 py-12 text-center text-white">
        <h2 className="text-3xl font-extrabold">Bugun boshlang</h2>
        <p className="max-w-xl text-white/90">
          Botni oching, roʻyxatdan oʻting va bepul darslar bilan tanishing.
        </p>
        <BotButton light />
      </div>
    </section>
  );
}
