import type { CourseView, MyStats } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileText, ListChecks, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState } from "../components/states";
import { api } from "../lib/api";
import { useStats } from "../lib/me";

type Topic = CourseView["topics"][number];
type Progress = MyStats["topics"][number];

const tone = (p: number) =>
  p >= 80 ? "bg-success/10 text-success" : p >= 60 ? "bg-brand/10 text-brand" : "bg-danger/10 text-danger";

/** T-067: mavzu testidagi eng yaxshi natija */
function Best({ p }: { p: Progress }) {
  if (p.bestPercent === null) return null;
  return (
    <span
      className={`rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums ${tone(p.bestPercent)}`}
      data-testid="best"
    >
      {p.bestPercent}%
    </span>
  );
}

function TopicCard({ topic, progress }: { topic: Topic; progress?: Progress }) {
  return (
    <section className="card space-y-1 p-3" data-testid="topic">
      <div className="flex items-center gap-2 px-1">
        <h3 className="flex-1 font-bold">{topic.title}</h3>
        {progress && <Best p={progress} />}
      </div>
      <ul>
        {topic.lessons.map((l) => (
          <li key={l.id}>
            <Link to={`/lessons/${l.id}`} className="tap flex min-h-12 items-center gap-3 rounded-xl px-1">
              {l.locked ? (
                <Lock size={18} className="shrink-0 text-hint" aria-label="Yopiq" />
              ) : (
                <FileText size={18} className="shrink-0 text-brand" />
              )}
              <span className={`flex-1 text-[15px] ${l.locked ? "text-hint" : ""}`}>{l.title}</span>
              {l.isFree && (
                <span className="rounded-lg bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                  Bepul
                </span>
              )}
              <ChevronRight size={18} className="text-hint" />
            </Link>
          </li>
        ))}
      </ul>
      {topic.questionCount > 0 && (
        <Link
          to={`/topics/${topic.id}/test`}
          className="tap flex min-h-12 items-center gap-3 rounded-xl bg-brand/5 px-2 font-semibold text-brand"
        >
          <ListChecks size={18} className="shrink-0" />
          <span className="flex-1 text-[15px]">Mavzu testi</span>
          <span className="text-xs text-hint">
            {progress ? `${progress.attempts} marta ishlangan` : `${topic.questionCount} ta savol`}
          </span>
          <ChevronRight size={18} className="text-hint" />
        </Link>
      )}
    </section>
  );
}

export function LessonsPage() {
  const courses = useQuery({ queryKey: ["courses"], queryFn: () => api<CourseView[]>("/courses") });
  const progress = new Map(useStats().data?.topics.map((t) => [t.topicId, t]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Darslar</h1>
      {courses.isPending && (
        <div className="space-y-3" aria-busy="true">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
      )}
      {courses.isError && <ErrorState message={courses.error.message} onRetry={() => courses.refetch()} />}
      {courses.data?.length === 0 && (
        <EmptyState
          title="Hozircha darslar yoʻq"
          hint="Ustoz kurs joylagach, mavzular boʻyicha shu yerda chiqadi."
        />
      )}
      {courses.data?.map((c) => (
        <div key={c.id} className="space-y-2" data-testid="course">
          <h2 className="text-sm font-bold uppercase tracking-wide text-hint">{c.title}</h2>
          {c.description && <p className="text-sm text-hint">{c.description}</p>}
          {c.topics.map((t) => (
            <TopicCard key={t.id} topic={t} progress={progress.get(t.id)} />
          ))}
        </div>
      ))}
    </div>
  );
}
