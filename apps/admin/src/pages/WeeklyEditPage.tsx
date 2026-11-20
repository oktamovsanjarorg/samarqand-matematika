import {
  nextWeekWindow,
  weeklyTestInput,
  type AdminWeeklyDetail,
  type WeeklyQuestionRow,
} from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, ErrorState, SkeletonList } from "../components/ui";
import { QuestionPicker } from "../components/weekly/QuestionPicker";
import { Standings } from "../components/weekly/Standings";
import { api } from "../lib/api";
import { fromLocalInput, toLocalInput } from "../lib/weekly";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

interface Draft {
  title: string;
  opens: string;
  closes: string;
  questions: WeeklyQuestionRow[];
  isPublished: boolean;
}

function draftOf(t?: AdminWeeklyDetail): Draft {
  if (t)
    return {
      title: t.title,
      opens: toLocalInput(t.opensAt),
      closes: toLocalInput(t.closesAt),
      questions: t.questions,
      isPublished: t.isPublished,
    };
  const w = nextWeekWindow(new Date());
  return {
    title: "",
    opens: toLocalInput(w.opensAt.toISOString()),
    closes: toLocalInput(w.closesAt.toISOString()),
    questions: [],
    isPublished: false,
  };
}

function useSave(id: string | undefined) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (d: Draft) => {
      const body = {
        title: d.title,
        opensAt: fromLocalInput(d.opens),
        closesAt: fromLocalInput(d.closes),
        questionIds: d.questions.map((q) => q.id),
        isPublished: d.isPublished,
      };
      const parsed = weeklyTestInput.safeParse(body);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Maʼlumot notoʻgʻri");
      return id ? api.put(`/admin/weekly/${id}`, body) : api.post("/admin/weekly", body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["weekly"] });
      navigate("/weekly");
    },
  });
}

function WindowFields({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-semibold text-hint">Ochiladi (Toshkent vaqti)</span>
        <input
          type="datetime-local"
          value={d.opens}
          onChange={(e) => set({ opens: e.target.value })}
          aria-label="Ochiladi"
          className={field}
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-semibold text-hint">Yopiladi</span>
        <input
          type="datetime-local"
          value={d.closes}
          onChange={(e) => set({ closes: e.target.value })}
          aria-label="Yopiladi"
          className={field}
        />
      </label>
    </div>
  );
}

function Form({ initial, id }: { initial?: AdminWeeklyDetail; id?: string }) {
  const [d, setD] = useState<Draft>(() => draftOf(initial));
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const save = useSave(id);
  return (
    <div className="space-y-4">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-hint">Nomi</span>
        <input
          value={d.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Masalan: 48-hafta"
          aria-label="Nomi"
          className={field}
        />
      </label>
      <WindowFields d={d} set={set} />
      <div className="space-y-1">
        <p className="text-xs font-semibold text-hint">Savollar ({d.questions.length})</p>
        <QuestionPicker value={d.questions} onChange={(questions) => set({ questions })} />
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={d.isPublished}
          onChange={(e) => set({ isPublished: e.target.checked })}
          className="h-5 w-5"
        />
        <span className="text-sm font-semibold">Nashr qilingan (oʻquvchilar koʻradi)</span>
      </label>
      <Button
        onClick={() => save.mutate(d)}
        busy={save.isPending}
        disabled={!d.title.trim() || d.questions.length === 0}
      >
        Saqlash
      </Button>
      {save.error && (
        <p className="text-sm text-danger" role="alert">
          {save.error.message}
        </p>
      )}
    </div>
  );
}

export function WeeklyEditPage() {
  const { id } = useParams();
  const t = useQuery({
    queryKey: ["weekly", id],
    queryFn: () => api.get<AdminWeeklyDetail>(`/admin/weekly/${id}`),
    enabled: !!id,
  });
  return (
    <div className="space-y-4">
      <Link to="/weekly" className="flex w-fit items-center gap-1 text-sm font-semibold text-link">
        <ArrowLeft size={16} /> Haftalik testlar
      </Link>
      <h1 className="text-xl font-extrabold">{id ? "Haftalik test" : "Yangi haftalik test"}</h1>
      {id && t.isPending && <SkeletonList rows={3} />}
      {t.isError && <ErrorState message={t.error.message} onRetry={() => t.refetch()} />}
      {!id && <Form />}
      {t.data && <Form initial={t.data} id={t.data.id} />}
      {t.data && t.data.status !== "UPCOMING" && <Standings id={t.data.id} total={t.data.questionCount} />}
    </div>
  );
}
