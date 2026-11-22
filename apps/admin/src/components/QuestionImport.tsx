import type { QuestionImportResult } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { downloadCsv } from "../lib/download";
import { TYPE_LABELS } from "../lib/questions";
import { CsvPicker } from "./CsvPicker";
import { MathText } from "./MathText";
import { Button } from "./ui";

/** Ustunlar namunasi: har tur uchun bitta qator (faqat format ko'rsatmasi, bazaga yozilmaydi) */
const TEMPLATE = [
  ["Tur", "Savol", "A", "B", "C", "D", "Javob", "Yechim", "Qiyinlik", "Teglar"],
  ["bitta", "$2+3$ nechaga teng?", "4", "5", "6", "", "B", "", "oson", "arifmetika"],
  ["bir nechta", "Qaysilari juft son?", "2", "3", "4", "", "A, C", "", "", ""],
  ["son", "$\\frac{1}{2}+\\frac{1}{4}$ ni hisoblang", "", "", "", "", "3/4", "", "", "kasrlar"],
  ["ifoda", "$2(x+1)$ ni soddalashtiring", "", "", "", "", "2x+2", "", "", ""],
  ["yozma", "$\\sqrt{2}$ irratsional ekanini isbotlang", "", "", "", "", "", "", "qiyin", ""],
];

function Preview({ r }: { r: QuestionImportResult }) {
  return (
    <div className="space-y-2" data-testid="import-preview">
      {r.errors.length > 0 && (
        <ul className="space-y-1 text-sm text-danger" role="alert">
          {r.errors.map((e) => (
            <li key={`${e.line}-${e.message}`}>
              {e.line}-qator: {e.message}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm font-semibold">{r.ready.length} ta savol tayyor</p>
      <ol className="space-y-1">
        {r.ready.map((q) => (
          <li key={q.line} className="rounded-lg border border-hint/15 p-2 text-sm">
            <MathText text={q.text} className="line-clamp-2" />
            <p className="text-xs text-hint">
              {q.line}-qator · {TYPE_LABELS[q.type]}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Excel (CSV) dan savollarni qoralama sifatida qo'shish (T-100) */
export function QuestionImport({ topicId }: { topicId: string }) {
  const qc = useQueryClient();
  const [csv, setCsv] = useState("");
  const send = (dryRun: boolean) =>
    api.post<QuestionImportResult>(`/admin/topics/${topicId}/questions/import`, { csv, dryRun });
  const check = useMutation({ mutationFn: () => send(true) });
  const save = useMutation({
    mutationFn: () => send(false),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["questions"] }),
  });
  const onText = (text: string) => {
    setCsv(text);
    check.reset();
    save.reset();
  };
  const ok = !!check.data && check.data.errors.length === 0 && check.data.ready.length > 0;
  const error = check.error ?? save.error;
  return (
    <details className="card space-y-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <FileUp size={16} /> Excel'dan import
      </summary>
      <p className="text-sm text-hint">
        Excel jadvalini “CSV” qilib saqlang. Ustunlar: Tur, Savol, A–H variantlar, Javob, Yechim, Qiyinlik,
        Teglar. Faqat «Savol» majburiy. Savollar qoralama boʻlib tushadi: koʻrib chiqib nashr qiling.
      </p>
      <Button variant="secondary" onClick={() => downloadCsv("Savollar namunasi", TEMPLATE)}>
        <Download size={16} /> Namuna fayl
      </Button>
      <CsvPicker onText={onText} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => check.mutate()} busy={check.isPending} disabled={!csv}>
          Tekshirish
        </Button>
        <Button onClick={() => save.mutate()} busy={save.isPending} disabled={!ok || !!save.data}>
          {ok ? `${check.data.ready.length} ta savolni qoʻshish` : "Qoʻshish"}
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error.message}</p>}
      {save.data && (
        <p className="text-sm font-semibold text-success" role="status">
          {save.data.created} ta savol qoralama sifatida qoʻshildi
        </p>
      )}
      {check.data && !save.data && <Preview r={check.data} />}
    </details>
  );
}
