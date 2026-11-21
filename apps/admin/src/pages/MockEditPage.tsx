import {
  mockTestInput,
  nextWeekWindow,
  type AdminMockDetail,
  type ExamTemplate,
  type ExamTemplateInput,
  type WeeklyQuestionRow,
} from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MockResults } from "../components/mock/MockResults";
import { SectionPickers } from "../components/mock/SectionPickers";
import { Button, ErrorState, SkeletonList } from "../components/ui";
import { WindowFields } from "../components/weekly/WindowFields";
import { api } from "../lib/api";
import { fromLocalInput, nextTitle, shiftedWindow, toLocalInput } from "../lib/weekly";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

interface Draft {
  title: string;
  templateId: string;
  opens: string;
  closes: string;
  sections: WeeklyQuestionRow[][];
  isPublished: boolean;
}

function draftOf(m?: AdminMockDetail): Draft {
  if (m)
    return {
      title: m.title,
      templateId: m.templateId ?? "",
      opens: toLocalInput(m.opensAt),
      closes: toLocalInput(m.closesAt),
      sections: m.sections,
      isPublished: m.isPublished,
    };
  const w = nextWeekWindow(new Date());
  const iso = (d: Date) => toLocalInput(d.toISOString());
  return {
    title: "",
    templateId: "",
    opens: iso(w.opensAt),
    closes: iso(w.closesAt),
    sections: [],
    isPublished: false,
  };
}

/** Nusxa (T-098): o'sha shablon va savollar, keyingi oyna, raqami oshgan nom; nashr qilinmagan holda */
function copyOf(m: AdminMockDetail): Draft {
  const w = shiftedWindow(m.opensAt, m.closesAt, new Date());
  return {
    title: nextTitle(m.title),
    templateId: m.templateId ?? "",
    opens: toLocalInput(w.opensAt),
    closes: toLocalInput(w.closesAt),
    sections: m.sections,
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
        templateId: d.templateId,
        opensAt: fromLocalInput(d.opens),
        closesAt: fromLocalInput(d.closes),
        sections: d.sections.map((s) => s.map((q) => q.id)),
        isPublished: d.isPublished,
      };
      const parsed = mockTestInput.safeParse(body);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Maʼlumot notoʻgʻri");
      return id ? api.put(`/admin/mocks/${id}`, body) : api.post("/admin/mocks", body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mocks"] });
      navigate("/mocks");
    },
  });
}

/** Yangi mock uchun faol shablon tanlash; mavjud mockda shablon nusxasi o'zgarmaydi */
function TemplateSelect({ value, onPick }: { value: string; onPick: (t: ExamTemplate) => void }) {
  const list = useQuery({
    queryKey: ["exam-templates"],
    queryFn: () => api.get<ExamTemplate[]>("/admin/exam-templates"),
  });
  const active = list.data?.filter((t) => t.isActive) ?? [];
  if (list.data && active.length === 0)
    return <p className="text-sm text-danger">Faol imtihon shabloni yoʻq: ustoz Sozlamalarda yaratadi</p>;
  return (
    <select
      value={value}
      onChange={(e) => {
        const t = active.find((x) => x.id === e.target.value);
        if (t) onPick(t);
      }}
      aria-label="Shablon"
      className={field}
    >
      <option value="">Shablonni tanlang</option>
      {active.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

/** copy: mavjud mockdan yangi mock (shablonni qayta tanlash mumkin) */
function Form({ initial, copy = false }: { initial?: AdminMockDetail; copy?: boolean }) {
  const [d, setD] = useState<Draft>(() => (initial && copy ? copyOf(initial) : draftOf(initial)));
  const [template, setTemplate] = useState<ExamTemplateInput | undefined>(initial?.template);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const save = useSave(copy ? undefined : initial?.id);
  const ready = !!template && template.sections.every((s, i) => d.sections[i]?.length === s.count);
  return (
    <div className="space-y-4">
      <input
        value={d.title}
        onChange={(e) => set({ title: e.target.value })}
        placeholder="Mock nomi, masalan: Dekabr mock"
        aria-label="Nomi"
        className={field}
      />
      {initial && !copy ? (
        <p className="text-sm text-hint">Shablon: {initial.templateName} (nusxasi mockda saqlangan)</p>
      ) : (
        <TemplateSelect
          value={d.templateId}
          onPick={(t) => {
            setTemplate(t);
            set({ templateId: t.id, sections: t.sections.map(() => []) });
          }}
        />
      )}
      {template && <p className="text-sm text-hint">Vaqt: {template.durationMin} daqiqa</p>}
      <WindowFields d={d} set={set} />
      {template && (
        <SectionPickers
          sections={template.sections}
          value={d.sections}
          onChange={(sections) => set({ sections })}
        />
      )}
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={d.isPublished}
          onChange={(e) => set({ isPublished: e.target.checked })}
          className="h-5 w-5"
        />
        <span className="text-sm font-semibold">Nashr qilingan (oʻquvchilar koʻradi)</span>
      </label>
      <Button onClick={() => save.mutate(d)} busy={save.isPending} disabled={!d.title.trim() || !ready}>
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
      <h1 className="text-xl font-extrabold">{routeId ? "Mock" : "Yangi mock"}</h1>
      {routeId && (
        <Link
          to={`/mocks/new?from=${routeId}`}
          className="tap flex min-h-11 items-center gap-2 rounded-xl border border-hint/25 bg-section px-4 text-sm font-semibold"
        >
          <Copy size={16} /> Nusxa olish
        </Link>
      )}
    </div>
  );
}

/** Mavjud mock: tahrirlash va natijalar; yoki undan nusxa (T-098) */
function Loaded({ m, copy }: { m: AdminMockDetail; copy: boolean }) {
  if (copy)
    return (
      <>
        <p className="text-sm text-hint" data-testid="copy-hint">
          «{m.title}» nusxasi: shablon va savollar koʻchirildi, oyna keyingi haftaga surildi. Tekshirib
          saqlang.
        </p>
        <Form key={`copy-${m.id}`} initial={m} copy />
      </>
    );
  return (
    <>
      <Form key={m.id} initial={m} />
      {m.status !== "UPCOMING" && <MockResults id={m.id} title={m.title} />}
    </>
  );
}

export function MockEditPage() {
  const { id: routeId } = useParams();
  const from = useSearchParams()[0].get("from") ?? undefined;
  const id = routeId ?? from;
  const m = useQuery({
    queryKey: ["mocks", id],
    queryFn: () => api.get<AdminMockDetail>(`/admin/mocks/${id}`),
    enabled: !!id,
  });
  return (
    <div className="space-y-4">
      <Link to="/mocks" className="flex w-fit items-center gap-1 text-sm font-semibold text-link">
        <ArrowLeft size={16} /> Mocklar
      </Link>
      <Header routeId={routeId} />
      {id && m.isPending && <SkeletonList rows={3} />}
      {m.isError && <ErrorState message={m.error.message} onRetry={() => m.refetch()} />}
      {!id && <Form />}
      {m.data && <Loaded m={m.data} copy={!routeId} />}
    </div>
  );
}
