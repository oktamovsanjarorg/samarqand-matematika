import { TUTOR_MODES, type TutorMode } from "@samarqand/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { MathText } from "../components/MathText";
import { Badge, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { MODE_LABELS, useTutorChats } from "../lib/tutor";

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    dateStyle: "short",
    timeStyle: "short",
  });

/** O'quvchilarning AI yordamchi bilan suhbatlari (BR-T04): oxirgi faollik bo'yicha */
export function TutorChatsPage() {
  const [mode, setMode] = useState<TutorMode | null>(null);
  const q = useTutorChats(mode);
  const tabs: (TutorMode | null)[] = [null, ...TUTOR_MODES];
  return (
    <div className="space-y-4">
      <PageTitle title="AI yordamchi" />
      <p className="text-sm text-hint">
        Oʻquvchilar yordamchidan nima soʻragani. Raqam — oʻquvchi savollari soni.
      </p>
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-section p-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t ?? "ALL"}
            type="button"
            role="tab"
            aria-selected={mode === t}
            onClick={() => setMode(t)}
            className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold ${mode === t ? "bg-brand text-white" : "text-hint"}`}
          >
            {t ? MODE_LABELS[t] : "Hammasi"}
          </button>
        ))}
      </div>
      {q.isPending && <SkeletonList />}
      {q.isError && <ErrorState message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data?.length === 0 && (
        <EmptyState title="Suhbatlar yoʻq" hint="Oʻquvchi yordamchiga yozganda shu yerda chiqadi" />
      )}
      <ul className="space-y-2">
        {q.data?.map((c) => (
          <li key={c.id}>
            <Link to={`/tutor/${c.id}`} className="card block space-y-1" data-testid="tutor-chat-row">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 font-bold">{c.student.name}</span>
                <Badge tone="brand">{MODE_LABELS[c.mode]}</Badge>
                <span className="text-sm font-semibold">{c.asked} ta savol</span>
              </div>
              {c.question && <MathText text={c.question} className="line-clamp-2 text-sm text-hint" />}
              <p className="text-xs text-hint">{stamp(c.lastAt)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
