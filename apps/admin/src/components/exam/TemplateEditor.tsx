import { examMaxRaw, examQuestionCount, MILLIY_PRESET } from "@samarqand/shared";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { parseDraft, toDraft, type TemplateDraft } from "../../lib/exam";
import { Button } from "../ui";
import { field } from "./field";
import { GradesEditor } from "./GradesEditor";
import { SectionsEditor } from "./SectionsEditor";

function Summary({ parsed }: { parsed: ReturnType<typeof parseDraft> }) {
  if ("error" in parsed)
    return (
      <p className="text-sm text-danger" role="alert">
        {parsed.error}
      </p>
    );
  const { sections, durationMin } = parsed.input;
  return (
    <p className="text-sm text-hint" data-testid="exam-summary">
      {examQuestionCount(sections)} ta savol · eng yuqori xom ball {examMaxRaw(sections)} · {durationMin}{" "}
      daqiqa
    </p>
  );
}

/** Nom, vaqt va shkala */
function HeadFields({ d, setD }: { d: TemplateDraft; setD: (d: TemplateDraft) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem]">
      <input
        value={d.name}
        onChange={(e) => setD({ ...d, name: e.target.value })}
        placeholder="Shablon nomi"
        aria-label="Shablon nomi"
        className={field}
      />
      <label className="text-xs text-hint">
        Vaqt, daqiqa
        <input
          value={d.durationMin}
          onChange={(e) => setD({ ...d, durationMin: e.target.value })}
          inputMode="numeric"
          aria-label="Vaqt, daqiqa"
          className={field}
        />
      </label>
      <label className="text-xs text-hint">
        Shkala (eng yuqori)
        <input
          value={d.scaleMax}
          onChange={(e) => setD({ ...d, scaleMax: e.target.value })}
          inputMode="decimal"
          aria-label="Shkala"
          className={field}
        />
      </label>
    </div>
  );
}

/** Shablon formasi: yangi (id yo'q) yoki mavjudini tahrirlash */
export function TemplateEditor(p: { id?: string; initial: TemplateDraft; onDone: () => void }) {
  const [d, setD] = useState(p.initial);
  const parsed = parseDraft(d);
  const save = useMutation({
    mutationFn: () => {
      if (!("input" in parsed)) throw new Error(parsed.error);
      return p.id
        ? api.put(`/admin/exam-templates/${p.id}`, parsed.input)
        : api.post("/admin/exam-templates", parsed.input);
    },
    onSuccess: p.onDone,
  });
  return (
    <div className="space-y-4 rounded-xl border border-brand/30 p-3" data-testid="exam-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">{p.id ? "Shablonni tahrirlash" : "Yangi shablon"}</h3>
        <Button variant="secondary" onClick={() => setD(toDraft(MILLIY_PRESET))}>
          Milliy sertifikat taklifi
        </Button>
      </div>
      <HeadFields d={d} setD={setD} />
      <SectionsEditor value={d.sections} onChange={(sections) => setD({ ...d, sections })} />
      <GradesEditor value={d.grades} onChange={(grades) => setD({ ...d, grades })} />
      <Summary parsed={parsed} />
      {save.error && <p className="text-sm text-danger">{save.error.message}</p>}
      <div className="flex gap-2">
        <Button onClick={() => save.mutate()} busy={save.isPending} disabled={"error" in parsed}>
          Saqlash
        </Button>
        <Button variant="ghost" onClick={p.onDone}>
          Bekor qilish
        </Button>
      </div>
    </div>
  );
}
