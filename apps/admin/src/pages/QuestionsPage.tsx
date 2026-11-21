import type { AdminQuestionRow } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MathText } from "../components/MathText";
import { RowActions } from "../components/RowActions";
import { QuestionImport } from "../components/QuestionImport";
import { Badge, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { moved, reorder, useTree } from "../lib/content";
import { DIFFICULTY_LABELS, TYPE_LABELS, manualBadge } from "../lib/questions";

function useQuestions(topicId: string) {
  const qc = useQueryClient();
  const key = ["questions", topicId];
  const done = { onSuccess: () => qc.invalidateQueries({ queryKey: key }) };
  return {
    list: useQuery({
      queryKey: key,
      queryFn: () => api.get<AdminQuestionRow[]>(`/admin/topics/${topicId}/questions`),
    }),
    order: useMutation({ mutationFn: reorder, ...done }),
    remove: useMutation({ mutationFn: (id: string) => api.del(`/admin/questions/${id}`), ...done }),
  };
}

function QuestionRow(p: {
  q: AdminQuestionRow;
  n: number;
  onUp?: () => void;
  onDown?: () => void;
  onDelete: () => void;
}) {
  const { q } = p;
  return (
    <li className="card flex items-start gap-2" data-testid="question">
      <Link to={`/content/questions/${q.id}`} className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap gap-1">
          <Badge tone="brand">{TYPE_LABELS[q.type]}</Badge>
          <Badge>{DIFFICULTY_LABELS[q.difficulty]}</Badge>
          {manualBadge(q) && <Badge tone="accent">Ustoz tekshiradi</Badge>}
          {!q.isPublished && <Badge>Qoralama</Badge>}
        </div>
        <MathText text={q.text} className="line-clamp-3 text-sm" />
      </Link>
      <RowActions name={`${p.n}-savol`} onUp={p.onUp} onDown={p.onDown} onDelete={p.onDelete} />
    </li>
  );
}

export function QuestionsPage() {
  const { topicId = "" } = useParams();
  const { list, order, remove } = useQuestions(topicId);
  const topic = useTree()
    .data?.flatMap((c) => c.topics)
    .find((t) => t.id === topicId);
  const rows = list.data ?? [];
  const ids = rows.map((q) => q.id);
  const move = (i: number, dir: -1 | 1) => {
    const next = moved(ids, i, dir);
    return next ? () => order.mutate({ kind: "question", ids: next }) : undefined;
  };
  const error = order.error ?? remove.error;

  return (
    <div className="space-y-4">
      <Link to="/content" className="flex w-fit items-center gap-1 text-sm font-semibold text-link">
        <ArrowLeft size={16} /> Kontent
      </Link>
      <PageTitle title={`Savollar: ${topic?.title ?? ""}`}>
        <Link
          to={`/content/topics/${topicId}/questions/new`}
          className="tap flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Yangi savol
        </Link>
      </PageTitle>
      <QuestionImport topicId={topicId} />
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error.message}
        </p>
      )}
      {list.isPending && <SkeletonList />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState title="Savol yoʻq" hint="Mavzu testi uchun savollar qoʻshing" />
      )}
      <ul className="space-y-2">
        {rows.map((q, i) => (
          <QuestionRow
            key={q.id}
            q={q}
            n={i + 1}
            onUp={move(i, -1)}
            onDown={move(i, 1)}
            onDelete={() => remove.mutate(q.id)}
          />
        ))}
      </ul>
    </div>
  );
}
