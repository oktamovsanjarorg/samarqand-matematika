import type { LessonLink, LessonView } from "@samarqand/shared";
import { ChevronLeft, ChevronRight, ClipboardCheck, Lock } from "lucide-react";
import { Link } from "react-router-dom";

function Neighbor({ l, dir }: { l: LessonLink; dir: "prev" | "next" }) {
  const next = dir === "next";
  return (
    <Link
      to={`/lessons/${l.id}`}
      className={`tap card flex min-w-0 flex-1 items-center gap-2 ${next ? "flex-row-reverse text-right" : ""}`}
    >
      {next ? (
        <ChevronRight size={18} className="shrink-0 text-hint" />
      ) : (
        <ChevronLeft size={18} className="shrink-0 text-hint" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-hint">{next ? "Keyingi dars" : "Oldingi dars"}</p>
        <p className="flex items-center gap-1 truncate text-sm font-semibold">
          {l.locked && <Lock size={12} className="shrink-0 text-hint" aria-label="Yopiq" />}
          <span className="truncate">{l.title}</span>
        </p>
      </div>
    </Link>
  );
}

/** Dars oxiri: mavzu testi va qo'shni darslar (T-066) */
export function LessonFooter({ l }: { l: LessonView }) {
  return (
    <div className="space-y-3" data-testid="lesson-footer">
      {l.questionCount > 0 && (
        <Link
          to={`/topics/${l.topicId}/test`}
          className="tap flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 font-bold text-white"
        >
          <ClipboardCheck size={20} /> Mavzu testini ishlash · {l.questionCount} savol
        </Link>
      )}
      {(l.prev ?? l.next) && (
        <nav className="flex gap-2" aria-label="Darslar">
          {l.prev ? <Neighbor l={l.prev} dir="prev" /> : <div className="flex-1" />}
          {l.next ? <Neighbor l={l.next} dir="next" /> : <div className="flex-1" />}
        </nav>
      )}
    </div>
  );
}
