import type { InsightSource, MyRecommendations, TopicRecommendation } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../store/auth";

const SOURCE: Record<InsightSource, string> = { topic: "mavzu testi", weekly: "haftalik", mock: "mock" };

/** "mavzu testi 4, haftalik 2": qaysi testlardan nechta javob */
const sourcesText = (s: TopicRecommendation["sources"]) =>
  (Object.keys(SOURCE) as InsightSource[])
    .filter((k) => s[k] > 0)
    .map((k) => `${SOURCE[k]} ${s[k]}`)
    .join(", ");

const btn = "tap inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold";

function RecCard({ r }: { r: TopicRecommendation }) {
  return (
    <li className="card space-y-2" data-testid="recommendation">
      <div className="flex items-start gap-3">
        <Target size={22} className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{r.topicTitle}</p>
          <p className="text-sm text-hint">
            {r.total} ta savoldan {r.correct} tasi toʻgʻri ({sourcesText(r.sources)})
          </p>
          {r.weakSkills.length > 0 && (
            <p className="text-sm">Koʻp xato: {r.weakSkills.map((k) => k.replaceAll("-", " ")).join(", ")}</p>
          )}
        </div>
        <b className="text-lg tabular-nums text-danger">{r.percent}%</b>
      </div>
      <div className="flex flex-wrap gap-2">
        {r.lessonId && (
          <Link to={`/lessons/${r.lessonId}`} className={`${btn} bg-brand text-white`}>
            Darsni takrorlash
          </Link>
        )}
        <Link to={`/topics/${r.topicId}/test`} className={`${btn} border border-hint/25`}>
          Mavzu testi
        </Link>
      </div>
    </li>
  );
}

/** Kuchsiz mavzular (T-062, BR-R01): faqat faktlar, oxirgi 90 kun */
export function Recommendations() {
  const isStudent = useAuth((s) => s.user?.role === "STUDENT");
  const q = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api<MyRecommendations>("/me/recommendations"),
    enabled: isStudent,
  });
  if (!q.data || q.data.basis === 0) return null;
  return (
    <section className="space-y-2" data-testid="recommendations">
      <h2 className="font-bold">Nimani takrorlash kerak</h2>
      {q.data.items.length === 0 ? (
        <div className="card flex items-center gap-3">
          <CheckCircle2 size={22} className="shrink-0 text-success" />
          <p className="text-sm">
            Oxirgi 90 kundagi {q.data.basis} ta javobda kuchsiz mavzu topilmadi. Shu surʼatda davom eting!
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {q.data.items.map((r) => (
            <RecCard key={r.topicId} r={r} />
          ))}
        </ul>
      )}
    </section>
  );
}
