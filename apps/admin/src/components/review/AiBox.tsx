import type { ReviewItem } from "@samarqand/shared";
import { Bot } from "lucide-react";
import { SIGNAL_LABELS, VERDICT_LABELS } from "../../lib/review";

const STATUS_TEXT = {
  PENDING: "AI navbatda",
  RUNNING: "AI tekshirmoqda",
  FAILED: "AI hukm bermadi",
} as const;

/** AI hukmi: taklif xolos (BR-W06), faqat xodimga ko'rinadi (BR-W05) */
export function AiBox({ ai }: { ai: ReviewItem["ai"] }) {
  if (!ai) return <p className="text-xs text-hint">AI tekshiruvi yoʻq (rasm yoʻq yoki AI oʻchiq)</p>;
  const v = ai.verdict;
  if (!v)
    return (
      <p className="flex items-center gap-2 text-sm text-hint">
        <Bot size={16} /> {STATUS_TEXT[ai.status === "DONE" ? "FAILED" : ai.status]}
      </p>
    );
  return (
    <div
      className={`space-y-2 rounded-xl p-3 text-sm ${ai.suspected ? "bg-danger/10" : "bg-hint/5"}`}
      data-testid="ai-box"
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <Bot size={16} /> AI: {VERDICT_LABELS[v.verdict]}
        <span className="text-xs font-normal text-hint">ishonch: {v.confidence.toLowerCase()}</span>
        {ai.suggested !== null && <span className="ml-auto text-xs">tavsiya: {ai.suggested} ball</span>}
      </p>
      {v.teacherNote && <p>{v.teacherNote}</p>}
      {v.copySignals.length > 0 && (
        <ul className="list-disc pl-5 text-danger">
          {v.copySignals.map((s) => (
            <li key={s}>{SIGNAL_LABELS[s] ?? s}</li>
          ))}
        </ul>
      )}
      {v.steps.length > 0 && (
        <ol className="space-y-1">
          {v.steps.map((s, i) => (
            <li key={i} className={s.ok ? "" : "text-danger"}>
              {s.ok ? "✓" : "✗"} {s.text}
              {s.note && <span className="text-hint"> — {s.note}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
