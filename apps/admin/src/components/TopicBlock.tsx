import type { AdminLessonRow, AdminTopicRow } from "@samarqand/shared";
import { FileText, ListChecks } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { moved, reorder, useTreeMutation } from "../lib/content";
import { InlineForm } from "./InlineForm";
import { RowActions } from "./RowActions";
import { Badge } from "./ui";

type Move = (ids: string[], i: number, dir: -1 | 1) => (() => void) | undefined;

function LessonRow(p: {
  lesson: AdminLessonRow;
  ids: string[];
  index: number;
  move: Move;
  onDelete: () => void;
}) {
  const l = p.lesson;
  return (
    <li className="flex items-center gap-2 rounded-lg bg-surface px-2" data-testid="lesson-row">
      <Link
        to={`/content/lessons/${l.id}`}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm"
      >
        <FileText size={16} className="shrink-0 text-hint" />
        <span className="line-clamp-2 break-words">{l.title}</span>
        {l.isFree && <Badge tone="success">Bepul</Badge>}
        {!l.isPublished && <Badge>Qoralama</Badge>}
      </Link>
      <RowActions
        name={l.title}
        onUp={p.move(p.ids, p.index, -1)}
        onDown={p.move(p.ids, p.index, 1)}
        onDelete={p.onDelete}
      />
    </li>
  );
}

function useTopicActions(topicId: string) {
  const navigate = useNavigate();
  return {
    rename: useTreeMutation((title: string) => api.patch(`/admin/topics/${topicId}`, { title })),
    remove: useTreeMutation(() => api.del(`/admin/topics/${topicId}`)),
    order: useTreeMutation(reorder),
    removeLesson: useTreeMutation((id: string) => api.del(`/admin/lessons/${id}`)),
    addLesson: useTreeMutation((title: string) =>
      api
        .post<{ id: string }>(`/admin/topics/${topicId}/lessons`, { title })
        .then((l) => navigate(`/content/lessons/${l.id}`)),
    ),
  };
}

function QuestionsLink({ topicId, count }: { topicId: string; count: number }) {
  return (
    <Link
      to={`/content/topics/${topicId}/questions`}
      className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-link"
    >
      <ListChecks size={16} /> Mavzu testi savollari ({count})
    </Link>
  );
}

/** Mavzu: darslar ro'yxati, dars qo'shish, tartiblash */
export function TopicBlock(p: { topic: AdminTopicRow; siblings: string[]; index: number }) {
  const { topic } = p;
  const [renaming, setRenaming] = useState(false);
  const a = useTopicActions(topic.id);
  const move =
    (kind: "topic" | "lesson"): Move =>
    (ids, i, dir) => {
      const next = moved(ids, i, dir);
      return next ? () => a.order.mutate({ kind, ids: next }) : undefined;
    };
  const lessonIds = topic.lessons.map((l) => l.id);
  const error =
    a.rename.error ?? a.remove.error ?? a.order.error ?? a.addLesson.error ?? a.removeLesson.error;

  return (
    <section className="space-y-2 rounded-xl border border-hint/15 p-3" data-testid="topic">
      {renaming ? (
        <InlineForm
          label="Saqlash"
          placeholder="Mavzu nomi"
          initial={topic.title}
          busy={a.rename.isPending}
          onSubmit={(t) => a.rename.mutate(t, { onSuccess: () => setRenaming(false) })}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-x-2">
          <h3 className="min-w-40 flex-1 break-words font-bold">{topic.title}</h3>
          <RowActions
            name={topic.title}
            onUp={move("topic")(p.siblings, p.index, -1)}
            onDown={move("topic")(p.siblings, p.index, 1)}
            onRename={() => setRenaming(true)}
            onDelete={() => a.remove.mutate(undefined)}
          />
        </div>
      )}
      <ul className="space-y-1">
        {topic.lessons.map((l, i) => (
          <LessonRow
            key={l.id}
            lesson={l}
            ids={lessonIds}
            index={i}
            move={move("lesson")}
            onDelete={() => a.removeLesson.mutate(l.id)}
          />
        ))}
      </ul>
      <QuestionsLink topicId={topic.id} count={topic.questionCount} />
      <InlineForm
        label="Dars"
        placeholder="Yangi dars nomi"
        busy={a.addLesson.isPending}
        onSubmit={(t) => a.addLesson.mutate(t)}
      />
      {error && <p className="text-sm text-danger">{error.message}</p>}
    </section>
  );
}
