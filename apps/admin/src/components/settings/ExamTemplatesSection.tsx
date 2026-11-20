import { examMaxRaw, examQuestionCount, type ExamTemplate } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { EMPTY_DRAFT, toDraft } from "../../lib/exam";
import { TemplateEditor } from "../exam/TemplateEditor";
import { Badge, Button, EmptyState, SkeletonList } from "../ui";

function TemplateRow(p: { t: ExamTemplate; onEdit: () => void; onDone: () => void }) {
  const { t } = p;
  const toggle = useMutation({
    mutationFn: () => api.patch(`/admin/exam-templates/${t.id}`, { isActive: !t.isActive }),
    onSuccess: p.onDone,
  });
  return (
    <li
      className="flex flex-wrap items-center gap-2 rounded-xl border border-hint/15 p-3"
      data-testid="exam-template"
    >
      <div className="min-w-48 flex-1">
        <p className="font-bold">{t.name}</p>
        <p className="text-sm text-hint">
          {examQuestionCount(t.sections)} ta savol · {t.sections.length} boʻlim · xom ball{" "}
          {examMaxRaw(t.sections)} · {t.durationMin} daqiqa · shkala {t.scaleMax}
        </p>
        {t.grades.length > 0 && (
          <p className="text-xs text-hint">{t.grades.map((g) => `${g.label} ${g.min}+`).join(" · ")}</p>
        )}
      </div>
      {!t.isActive && <Badge>Yashirilgan</Badge>}
      <Button variant="secondary" onClick={p.onEdit}>
        Tahrirlash
      </Button>
      <Button variant="ghost" onClick={() => toggle.mutate()} busy={toggle.isPending}>
        {t.isActive ? "Yashirish" : "Koʻrsatish"}
      </Button>
    </li>
  );
}

/** Imtihon shablonlari (BR-M01): Mock tuzilmasi shu yerda, kodda emas */
export function ExamTemplatesSection() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["exam-templates"],
    queryFn: () => api.get<ExamTemplate[]>("/admin/exam-templates"),
  });
  const [editing, setEditing] = useState<string | null>(null);
  const done = () => {
    setEditing(null);
    void qc.invalidateQueries({ queryKey: ["exam-templates"] });
  };

  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Imtihon shablonlari</h2>
      <p className="text-sm text-hint">
        Mock tuzilmasi: boʻlimlar, ballar, vaqt va darajalar. Milliy sertifikat taklifi ikkilamchi
        manbalardan, rasmiy UzBMB spetsifikatsiyasi bilan tekshiring
      </p>
      {list.isPending && <SkeletonList rows={2} />}
      {list.data?.length === 0 && !editing && (
        <EmptyState title="Shablon yoʻq" hint="Mock yaratish uchun shablon kerak" />
      )}
      <ul className="space-y-2">
        {list.data?.map((t) =>
          t.id === editing ? (
            <TemplateEditor key={t.id} id={t.id} initial={toDraft(t)} onDone={done} />
          ) : (
            <TemplateRow key={t.id} t={t} onEdit={() => setEditing(t.id)} onDone={done} />
          ),
        )}
      </ul>
      {editing === "new" && <TemplateEditor initial={EMPTY_DRAFT} onDone={done} />}
      {!editing && <Button onClick={() => setEditing("new")}>Yangi shablon</Button>}
    </section>
  );
}
