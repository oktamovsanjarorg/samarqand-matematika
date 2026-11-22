import {
  QUESTION_TYPES,
  type AdminQuestionDetail,
  type QuestionInput,
  type QuestionType,
} from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MathText } from "../components/MathText";
import { AnswerEditor } from "../components/question/AnswerEditor";
import { DraftRestored } from "../components/DraftRestored";
import { Button, ErrorState, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { useLocalDraft } from "../lib/draft";
import {
  DIFFICULTY_LABELS,
  TYPE_LABELS,
  commonOf,
  draftOf,
  emptyQuestion,
  validationError,
} from "../lib/questions";

const field = "w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

function TextWithPreview(p: { label: string; value: string; rows: number; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-hint">{p.label}</span>
      <textarea
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        aria-label={p.label}
        rows={p.rows}
        className={`${field} py-2 font-mono`}
      />
      {p.value.trim() && (
        <div className="card text-sm" data-testid="preview">
          <MathText text={p.value} />
        </div>
      )}
    </label>
  );
}

function MetaFields({ q, set }: { q: QuestionInput; set: (patch: Partial<QuestionInput>) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-semibold text-hint">Qiyinlik</span>
        <select
          value={q.difficulty ?? 2}
          onChange={(e) => set({ difficulty: Number(e.target.value) })}
          className={`${field} min-h-11`}
        >
          {[1, 2, 3].map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs font-semibold text-hint">Koʻnikma teglari (vergul bilan)</span>
        <input
          defaultValue={(q.skills ?? []).join(", ")}
          onChange={(e) =>
            set({
              skills: e.target.value
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean),
            })
          }
          placeholder="kasrlar, qisqartirish"
          className={`${field} min-h-11`}
        />
      </label>
    </div>
  );
}

/** Saqlash: avval brauzerda tekshiriladi, keyin server; muvaffaqiyatda ro'yxatga qaytadi */
function useSave(q: QuestionInput, topicId: string, id: string | undefined, clear: () => void) {
  const [invalid, setInvalid] = useState<string | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const save = useMutation({
    mutationFn: () =>
      id ? api.put(`/admin/questions/${id}`, q) : api.post(`/admin/topics/${topicId}/questions`, q),
    onSuccess: () => {
      clear();
      void qc.invalidateQueries({ queryKey: ["questions", topicId] });
      navigate(`/content/topics/${topicId}/questions`);
    },
  });
  const submit = () => {
    const error = validationError(q);
    setInvalid(error);
    if (!error) save.mutate();
  };
  return { submit, busy: save.isPending, error: invalid ?? save.error?.message };
}

function Form({ initial, topicId, id }: { initial: QuestionInput; topicId: string; id?: string }) {
  const local = useLocalDraft(`question:${id ?? `new:${topicId}`}`, initial);
  const [q, setQ] = [local.value, local.set];
  const set = (patch: Partial<QuestionInput>) => setQ((prev) => ({ ...prev, ...patch }) as QuestionInput);
  const save = useSave(q, topicId, id, local.clear);

  return (
    <div className="space-y-4">
      {local.restored && <DraftRestored onDiscard={local.discard} />}
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-hint">Savol turi</span>
        <select
          value={q.type}
          onChange={(e) => setQ(draftOf(e.target.value as QuestionType, commonOf(q)))}
          className={`${field} min-h-11`}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <TextWithPreview label="Savol matni" value={q.text} rows={4} onChange={(text) => set({ text })} />
      <AnswerEditor q={q} onChange={setQ} />
      <TextWithPreview
        label="Namunaviy yechim (natijadan keyin koʻrsatiladi)"
        value={q.solution ?? ""}
        rows={4}
        onChange={(solution) => set({ solution })}
      />
      <MetaFields q={q} set={set} />
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={q.isPublished ?? false}
          onChange={(e) => set({ isPublished: e.target.checked })}
          className="h-5 w-5"
        />
        <span className="text-sm font-semibold">Nashr qilingan (testga tushadi)</span>
      </label>
      <Button onClick={save.submit} busy={save.busy} disabled={!q.text.trim()}>
        Saqlash
      </Button>
      {save.error && (
        <p className="text-sm text-danger" role="alert">
          {save.error}
        </p>
      )}
    </div>
  );
}

export function QuestionEditPage() {
  const { topicId = "", id } = useParams();
  const existing = useQuery({
    queryKey: ["question", id],
    queryFn: () => api.get<AdminQuestionDetail>(`/admin/questions/${id}`),
    enabled: !!id,
  });
  const tId = existing.data?.topicId ?? topicId;
  return (
    <div className="space-y-4">
      <Link
        to={`/content/topics/${tId}/questions`}
        className="flex w-fit items-center gap-1 text-sm font-semibold text-link"
      >
        <ArrowLeft size={16} /> Savollar
      </Link>
      <h1 className="text-xl font-extrabold">{id ? "Savolni tahrirlash" : "Yangi savol"}</h1>
      {id && existing.isPending && <SkeletonList rows={3} />}
      {existing.isError && <ErrorState message={existing.error.message} onRetry={() => existing.refetch()} />}
      {!id && <Form initial={emptyQuestion()} topicId={topicId} />}
      {existing.data && (
        <Form initial={existing.data} topicId={existing.data.topicId} id={existing.data.id} />
      )}
    </div>
  );
}
