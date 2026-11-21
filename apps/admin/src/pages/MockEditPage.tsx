import {
  mockTestInput,
  nextWeekWindow,
  type AdminMockDetail,
  type ExamTemplate,
  type ExamTemplateInput,
  type WeeklyQuestionRow,
} from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MockResults } from "../components/mock/MockResults";
import { SectionPickers } from "../components/mock/SectionPickers";
import { Button, ErrorState, SkeletonList } from "../components/ui";
import { WindowFields } from "../components/weekly/WindowFields";
import { api } from "../lib/api";
import { fromLocalInput, toLocalInput } from "../lib/weekly";

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

function Form({ initial }: { initial?: AdminMockDetail }) {
  const [d, setD] = useState<Draft>(() => draftOf(initial));
  const [template, setTemplate] = useState<ExamTemplateInput | undefined>(initial?.template);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const save = useSave(initial?.id);
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
      {initial ? (
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

export function MockEditPage() {
  const { id } = useParams();
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
      <h1 className="text-xl font-extrabold">{id ? "Mock" : "Yangi mock"}</h1>
      {id && m.isPending && <SkeletonList rows={3} />}
      {m.isError && <ErrorState message={m.error.message} onRetry={() => m.refetch()} />}
      {!id && <Form />}
      {m.data && <Form initial={m.data} />}
      {m.data && m.data.status !== "UPCOMING" && <MockResults id={m.data.id} title={m.data.title} />}
    </div>
  );
}
