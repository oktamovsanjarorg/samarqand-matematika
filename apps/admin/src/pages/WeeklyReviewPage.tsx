import type { ReviewItem } from "@samarqand/shared";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ReviewCard } from "../components/review/ReviewCard";
import { EmptyState, ErrorState, SkeletonList } from "../components/ui";
import {
  filterItems,
  isFlagged,
  ofQuestion,
  questionChoices,
  useReview,
  type ReviewFilter,
} from "../lib/review";

const TABS: { id: ReviewFilter; label: string }[] = [
  { id: "TODO", label: "Tekshirilmagan" },
  { id: "FLAGGED", label: "Shubhali" },
  { id: "ALL", label: "Hammasi" },
];

function QuestionFilter(p: { all: ReviewItem[]; value: string; onChange: (qid: string) => void }) {
  const choices = questionChoices(p.all);
  if (choices.length < 2) return null;
  return (
    <select
      value={p.value}
      onChange={(e) => p.onChange(e.target.value)}
      aria-label="Savol"
      className="min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm"
    >
      <option value="">Hamma savollar</option>
      {choices.map((c) => (
        <option key={c.id} value={c.id}>
          {c.n}-savol ({filterItems(ofQuestion(p.all, c.id), "TODO").length} ta tekshirilmagan)
        </option>
      ))}
    </select>
  );
}

/** Ustoz navbati (BR-W05, W06): shubhalilar birinchi, oxirgi so'z ustozda */
export function WeeklyReviewPage() {
  const { id = "" } = useParams();
  const q = useReview(id);
  const [tab, setTab] = useState<ReviewFilter>("TODO");
  const [qid, setQid] = useState("");
  const all = q.data?.items ?? [];
  // T-102: bitta savolni hamma o'quvchida ketma-ket tekshirish: baho izchil bo'ladi
  const items = ofQuestion(all, qid);
  const count = (f: ReviewFilter) => filterItems(items, f).length;
  const shown = filterItems(items, tab);
  return (
    <div className="space-y-4">
      <Link to={`/weekly/${id}`} className="flex w-fit items-center gap-1 text-sm font-semibold text-link">
        <ArrowLeft size={16} /> Test
      </Link>
      <div>
        <h1 className="text-xl font-extrabold">Tekshirish navbati</h1>
        {q.data && (
          <p className="text-sm text-hint">
            {q.data.title} · shubhali: {all.filter(isFlagged).length}
          </p>
        )}
      </div>
      <QuestionFilter all={all} value={qid} onChange={setQid} />
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-section p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold ${tab === t.id ? "bg-brand text-white" : "text-hint"}`}
          >
            {t.label} ({count(t.id)})
          </button>
        ))}
      </div>
      {q.isPending && <SkeletonList />}
      {q.isError && <ErrorState message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data && shown.length === 0 && (
        <EmptyState title="Bu yerda javob yoʻq" hint="Topshirilgan javoblar shu yerda chiqadi" />
      )}
      <ul className="space-y-3">
        {shown.map((item) => (
          <ReviewCard key={`${item.attemptId}:${item.questionId}`} item={item} testId={id} />
        ))}
      </ul>
    </div>
  );
}
