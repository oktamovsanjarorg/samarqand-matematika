import type { AdminLessonDetail } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MathText } from "../components/MathText";
import { Button, ErrorState, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { TREE_KEY } from "../lib/content";
import { LessonAnnounce } from "../components/LessonAnnounce";

type Draft = Pick<AdminLessonDetail, "title" | "body" | "videoUrl" | "isFree" | "isPublished">;
const pick = (l: AdminLessonDetail): Draft => ({
  title: l.title,
  body: l.body,
  videoUrl: l.videoUrl,
  isFree: l.isFree,
  isPublished: l.isPublished,
});

const field = "w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";
const BODY_HINT = "Konspekt (formula: $x^2$ yoki $$\\frac{a}{b}$$)";

function Toggle(p: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-start gap-3">
      <input
        type="checkbox"
        checked={p.checked}
        onChange={(e) => p.onChange(e.target.checked)}
        className="mt-1 h-5 w-5"
      />
      <span>
        <span className="block text-sm font-semibold">{p.label}</span>
        <span className="block text-xs text-hint">{p.hint}</span>
      </span>
    </label>
  );
}

/** Matn va jonli ko'rinish: ustoz formulani o'quvchi ko'radigandek darhol ko'radi */
function BodyEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-semibold text-hint">{BODY_HINT}</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Konspekt"
          rows={14}
          className={`${field} py-2 font-mono`}
        />
      </label>
      <div className="space-y-1">
        <span className="text-xs font-semibold text-hint">Oʻquvchi koʻradigan koʻrinish</span>
        <div className="card min-h-40" data-testid="preview">
          {value.trim() ? <MathText text={value} /> : <p className="text-sm text-hint">Matn yoʻq</p>}
        </div>
      </div>
    </div>
  );
}

function useLessonActions(id: string) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const save = useMutation({
    mutationFn: (d: Draft) =>
      api.patch<AdminLessonDetail>(`/admin/lessons/${id}`, { ...d, videoUrl: d.videoUrl || null }),
    onSuccess: (l) => {
      qc.setQueryData(["lesson", id], l);
      void qc.invalidateQueries({ queryKey: TREE_KEY });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/admin/lessons/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TREE_KEY });
      navigate("/content");
    },
  });
  return { save, remove };
}

function Editor({ lesson }: { lesson: AdminLessonDetail }) {
  const [draft, setDraft] = useState<Draft>(() => pick(lesson));
  useEffect(() => setDraft(pick(lesson)), [lesson]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(lesson));
  const { save, remove } = useLessonActions(lesson.id);
  const error = save.error ?? remove.error;

  return (
    <div className="space-y-4">
      <input
        value={draft.title}
        onChange={(e) => set("title", e.target.value)}
        aria-label="Dars nomi"
        maxLength={200}
        className={`${field} min-h-11 text-base font-bold`}
      />
      <BodyEditor value={draft.body} onChange={(v) => set("body", v)} />
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-hint">Video havola (ixtiyoriy)</span>
        <input
          value={draft.videoUrl ?? ""}
          onChange={(e) => set("videoUrl", e.target.value)}
          placeholder="https://..."
          className={`${field} min-h-11`}
        />
      </label>
      <Toggle
        label="Bepul dars"
        hint="Obunasiz ham ochiq (sinov uchun)"
        checked={draft.isFree}
        onChange={(v) => set("isFree", v)}
      />
      <Toggle
        label="Nashr qilingan"
        hint="Oʻquvchilar koʻradi"
        checked={draft.isPublished}
        onChange={(v) => set("isPublished", v)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => save.mutate(draft)}
          busy={save.isPending}
          disabled={!dirty || !draft.title.trim()}
        >
          Saqlash
        </Button>
        {save.isSuccess && !dirty && <span className="text-sm text-success">Saqlandi</span>}
        <Button variant="danger" className="ml-auto" onClick={() => remove.mutate()} busy={remove.isPending}>
          Darsni oʻchirish
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error.message}</p>}
      <LessonAnnounce lesson={lesson} />
    </div>
  );
}

export function LessonEditorPage() {
  const { id = "" } = useParams();
  const lesson = useQuery({
    queryKey: ["lesson", id],
    queryFn: () => api.get<AdminLessonDetail>(`/admin/lessons/${id}`),
  });
  return (
    <div className="space-y-4">
      <Link to="/content" className="flex w-fit items-center gap-1 text-sm font-semibold text-link">
        <ArrowLeft size={16} /> Kontent
      </Link>
      {lesson.isPending && <SkeletonList rows={3} />}
      {lesson.isError && <ErrorState message={lesson.error.message} onRetry={() => lesson.refetch()} />}
      {lesson.data && <Editor lesson={lesson.data} />}
    </div>
  );
}
