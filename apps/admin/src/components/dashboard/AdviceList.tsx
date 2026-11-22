import type { Advice } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Badge } from "../ui";

const LEVEL = {
  urgent: { tone: "danger", text: "Shoshilinch" },
  important: { tone: "accent", text: "Muhim" },
  info: { tone: "hint", text: "Maʼlumot" },
} as const;

/** Maslahatchi (T-161): sinf va platforma bo'yicha faktli tavsiyalar; bo'sh bo'lsa ko'rinmaydi */
export function AdviceList() {
  const q = useQuery({ queryKey: ["advisor"], queryFn: () => api.get<Advice[]>("/admin/advisor") });
  if (!q.data?.length) return null;
  return (
    <section className="space-y-2" aria-label="Maslahatlar">
      <h2 className="flex items-center gap-2 font-bold">
        <Lightbulb size={18} className="text-accent" /> Maslahatlar
      </h2>
      <ul className="space-y-2">
        {q.data.map((a) => (
          <li key={a.key} className="card space-y-1" data-testid="advice">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={LEVEL[a.level].tone}>{LEVEL[a.level].text}</Badge>
              <p className="min-w-0 flex-1 font-bold">{a.title}</p>
            </div>
            <p className="text-sm text-hint">{a.why}</p>
            {a.action && (
              <Link
                to={a.action.to}
                className="tap inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-link"
              >
                {a.action.label} <ChevronRight size={16} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
