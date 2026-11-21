import {
  nextWeekWindow,
  weeklyTestInput,
  type AdminWeeklyDetail,
  type WeeklyQuestionRow,
} from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, ErrorState, SkeletonList } from "../components/ui";
import { QuestionPicker } from "../components/weekly/QuestionPicker";
import { WindowFields } from "../components/weekly/WindowFields";
import { Standings } from "../components/weekly/Standings";
import { api } from "../lib/api";
import { fromLocalInput, nextTitle, shiftedWindow, toLocalInput } from "../lib/weekly";

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

/** Nusxa (T-089): o'sha savollar, keyingi oyna, raqami oshgan nom; nashr qilinmagan holda */
function copyOf(t: AdminWeeklyDetail): Draft {
  const w = shiftedWindow(t.opensAt, t.closesAt, new Date());
  return {
    title: nextTitle(t.title),
    opens: toLocalInput(w.opensAt),
    closes: toLocalInput(w.closesAt),
    questions: t.questions,
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

function Form({ initial, id }: { initial: Draft; id?: string }) {
  const [d, setD] = useState<Draft>(initial);
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

function Header({ routeId }: { routeId?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-extrabold">{routeId ? "Haftalik test" : "Yangi haftalik test"}</h1>
      {routeId && (
        <Link
          to={`/weekly/new?from=${routeId}`}
          className="tap flex min-h-11 items-center gap-2 rounded-xl border border-hint/25 bg-section px-4 text-sm font-semibold"
        >
          <Copy size={16} /> Nusxa olish
        </Link>
      )}
    </div>
  );
}

/** Mavjud test: tahrirlash va natijalar; yoki undan nusxa (T-089) */
function Loaded({ t, copy }: { t: AdminWeeklyDetail; copy: boolean }) {
  if (copy)
    return (
      <>
        <p className="text-sm text-hint" data-testid="copy-hint">
          «{t.title}» nusxasi: savollar koʻchirildi, oyna keyingi haftaga surildi. Tekshirib saqlang.
        </p>
        <Form key={`copy-${t.id}`} initial={copyOf(t)} />
      </>
    );
  return (
    <>
      <Form key={t.id} initial={draftOf(t)} id={t.id} />
      {t.status !== "UPCOMING" && <Standings id={t.id} total={t.questionCount} title={t.title} />}
    </>
  );
}

export function WeeklyEditPage() {
  const { id: routeId } = useParams();
  const from = useSearchParams()[0].get("from") ?? undefined;
  const id = routeId ?? from;
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
      <Header routeId={routeId} />
      {id && t.isPending && <SkeletonList rows={3} />}
      {t.isError && <ErrorState message={t.error.message} onRetry={() => t.refetch()} />}
      {!id && <Form initial={draftOf()} />}
      {t.data && <Loaded t={t.data} copy={!routeId} />}
    </div>
  );
}
