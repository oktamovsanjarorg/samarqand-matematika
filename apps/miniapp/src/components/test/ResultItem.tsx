import type { AttemptResult, CheckResult } from "@samarqand/shared";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { describe } from "../../lib/answers";
import { MathText } from "../MathText";

type Item = AttemptResult["items"][number];

const STATUS: Record<CheckResult, { label: string; icon: typeof Clock; tone: string }> = {
  CORRECT: { label: "Toʻgʻri", icon: CheckCircle2, tone: "text-success" },
  WRONG: { label: "Xato", icon: XCircle, tone: "text-danger" },
  MANUAL: { label: "Ustoz tekshiradi", icon: Clock, tone: "text-hint" },
};

function Line({ label, text }: { label: string; text: string | null }) {
  return (
    <div className="text-sm">
      <span className="text-hint">{label}: </span>
      {text ? (
        <MathText text={text} className="inline" />
      ) : (
        <span className="text-hint">javob berilmagan</span>
      )}
    </div>
  );
}

/** zero: javob to'g'ri bo'lsa ham ball berilmagan sabab (haftalik testda yechim rasmi yo'q) */
export function ResultItem(p: { item: Item; n: number; zero?: string; children?: ReactNode }) {
  const { item, n, children } = p;
  const s = p.zero ? { label: p.zero, icon: XCircle, tone: "text-danger" } : STATUS[item.result];
  const Icon = s.icon;
  return (
    <li className="card space-y-2" data-testid="result-item">
      <div className={`flex items-center gap-2 text-sm font-bold ${s.tone}`}>
        <Icon size={18} /> {n}-savol · {s.label}
      </div>
      <MathText text={item.question.text} className="text-[15px]" />
      <Line label="Sizning javobingiz" text={describe(item.question, item.response)} />
      {item.result !== "CORRECT" && item.answer && (
        <Line label="Toʻgʻri javob" text={describe(item.question, item.answer)} />
      )}
      {item.solution.trim() && (
        <details className="rounded-xl bg-hint/5 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-link">Yechim</summary>
          <MathText text={item.solution} className="mt-2" />
        </details>
      )}
      {children}
    </li>
  );
}
