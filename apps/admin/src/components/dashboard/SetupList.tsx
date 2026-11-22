import type { AdminDashboard } from "@samarqand/shared";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { Link } from "react-router-dom";

type Step = { key: keyof AdminDashboard["setup"]; title: string; hint: string; to: string };

const STEPS: Step[] = [
  { key: "course", title: "Kurs va mavzu yarating", hint: "Kontent boʻlimida", to: "/content" },
  { key: "lesson", title: "Birinchi darsni nashr qiling", hint: "Mavzu ichida dars", to: "/content" },
  {
    key: "questions",
    title: "Savollar qoʻshing",
    hint: "Mavzu testi uchun; Excel (CSV) dan import ham bor",
    to: "/content",
  },
  {
    key: "billing",
    title: "Tarif va karta raqamini kiriting",
    hint: "Oʻquvchi chek yuborishi uchun",
    to: "/settings",
  },
  {
    key: "student",
    title: "Birinchi oʻquvchini qabul qiling",
    hint: "Oʻquvchi botda /start bosadi, siz shu yerda qabul qilasiz",
    to: "/students",
  },
];

/** Ishni boshlash (T-140): faqat ustozga, hamma qadam bajarilgach yo'qoladi */
export function SetupList({ setup }: { setup: AdminDashboard["setup"] }) {
  const done = STEPS.filter((s) => setup[s.key]).length;
  if (done === STEPS.length) return null;
  return (
    <section className="space-y-2" aria-label="Ishni boshlash">
      <h2 className="font-bold">
        Ishni boshlash{" "}
        <span className="text-sm font-semibold text-hint">
          {done}/{STEPS.length}
        </span>
      </h2>
      <ul className="card divide-y divide-hint/10 p-0">
        {STEPS.map((s) => (
          <li key={s.key} data-testid="setup-step" data-done={setup[s.key]}>
            <Link to={s.to} className="flex min-h-14 items-center gap-3 px-4 py-2">
              {setup[s.key] ? (
                <CheckCircle2 size={20} className="shrink-0 text-success" />
              ) : (
                <Circle size={20} className="shrink-0 text-hint" />
              )}
              <span className="min-w-0 flex-1">
                <span className="sr-only">{setup[s.key] ? "Bajarilgan: " : "Bajarilmagan: "}</span>
                <span className={`block font-semibold ${setup[s.key] ? "text-hint line-through" : ""}`}>
                  {s.title}
                </span>
                <span className="block text-sm text-hint">{s.hint}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-hint" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
