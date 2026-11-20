import { ERROR_CODES, type LessonView } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Lock, PlayCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { MathText } from "../components/MathText";
import { ErrorState } from "../components/states";
import { useBackButton } from "../hooks/useBackButton";
import { api, ApiError } from "../lib/api";
import { tg } from "../lib/telegram";

function Locked() {
  return (
    <div className="card flex flex-col items-center gap-3 py-8 text-center" data-testid="locked">
      <Lock size={32} className="text-hint" />
      <p className="font-bold">Bu dars obuna bilan ochiladi</p>
      <p className="text-sm text-hint">
        Toʻlov va ota-ona tasdigʻidan keyin barcha darslar ochiladi. Savol boʻlsa, ustozga yozing.
      </p>
    </div>
  );
}

function openVideo(url: string) {
  if (tg?.openLink) tg.openLink(url);
  else window.open(url, "_blank", "noopener");
}

export function LessonPage() {
  const { id = "" } = useParams();
  useBackButton("/lessons");
  const lesson = useQuery({
    queryKey: ["lesson", id],
    queryFn: () => api<LessonView>(`/lessons/${id}`),
    retry: false,
  });
  const err = lesson.error;

  if (lesson.isPending)
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-40" />
      </div>
    );
  if (err instanceof ApiError && err.code === ERROR_CODES.LOCKED) return <Locked />;
  if (err) return <ErrorState message={err.message} onRetry={() => lesson.refetch()} />;
  const l = lesson.data;

  return (
    <article className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-hint">
          {l.courseTitle} · {l.topicTitle}
        </p>
        <h1 className="text-xl font-extrabold">{l.title}</h1>
      </div>
      {l.videoUrl && (
        <button
          type="button"
          onClick={() => openVideo(l.videoUrl ?? "")}
          className="tap card flex w-full items-center gap-3 text-left"
        >
          <PlayCircle size={28} className="text-brand" />
          <span className="font-semibold">Video darsni koʻrish</span>
        </button>
      )}
      <div className="card text-[15px] leading-relaxed">
        {l.body.trim() ? <MathText text={l.body} /> : <p className="text-hint">Konspekt hali yozilmagan.</p>}
      </div>
    </article>
  );
}
