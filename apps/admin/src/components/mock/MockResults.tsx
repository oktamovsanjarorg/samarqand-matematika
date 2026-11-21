import type { AdminMockResults } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { csvTime, downloadCsv } from "../../lib/download";
import { formatDate } from "../../lib/labels";
import { ExportButton } from "../ExportButton";
import { Badge } from "../ui";

const METHOD = {
  OPEN: { label: "Oyna ochiq: taxminiy", tone: "hint" },
  APPROX: { label: "Taxminiy (topshirgan 30 dan kam)", tone: "hint" },
  RASCH: { label: "Rasch", tone: "success" },
} as const;

function ResultsTable({ d }: { d: AdminMockResults }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-hint">
          <tr>
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">Oʻquvchi</th>
            <th className="py-1 pr-2 text-right">Ball</th>
            <th className="py-1 pr-2">Daraja</th>
            {d.sectionTitles.map((t) => (
              <th key={t} className="py-1 pr-2 text-right">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hint/10">
          {d.rows.map((row, i) => (
            <tr key={row.userId} data-testid="mock-result-row">
              <td className="py-2 pr-2 text-hint">{i + 1}</td>
              <td className="py-2 pr-2">
                <p className="font-semibold">{row.name}</p>
                <p className="text-xs text-hint">
                  {row.submittedAt ? formatDate(row.submittedAt) : "yechmoqda"}
                </p>
              </td>
              <td className="py-2 pr-2 text-right font-bold text-brand">
                {row.scaled === null ? "—" : `${row.scaled}/${d.scaleMax}`}
              </td>
              <td className="py-2 pr-2">{row.grade ?? "—"}</td>
              {d.sectionTitles.map((t, k) => (
                <td key={t} className="py-2 pr-2 text-right tabular-nums">
                  {row.sections[k] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Mock natijalari: shkala balli, daraja va bo'limlar bo'yicha xom ball (T-053b) */
export function MockResults({ id, title }: { id: string; title: string }) {
  const r = useQuery({
    queryKey: ["mock-results", id],
    queryFn: () => api.get<AdminMockResults>(`/admin/mocks/${id}/results`),
  });
  const d = r.data;
  if (!d) return null;
  const exportCsv = () =>
    downloadCsv(title, [
      ["#", "Oʻquvchi", "Topshirgan", "Ball", "Daraja", "Xom ball", ...d.sectionTitles],
      ...d.rows.map((x, i) => [
        i + 1,
        x.name,
        csvTime(x.submittedAt),
        x.scaled,
        x.grade,
        x.raw,
        ...x.sections,
      ]),
    ]);
  return (
    <section className="card space-y-3" data-testid="mock-results">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 flex-1 font-bold">Natijalar · topshirgan: {d.submitted}</h2>
        <Badge tone={METHOD[d.method].tone}>{METHOD[d.method].label}</Badge>
        {d.rows.length > 0 && <ExportButton onClick={exportCsv} />}
      </div>
      {d.rows.length === 0 && <p className="text-sm text-hint">Hali hech kim boshlamagan</p>}
      <ResultsTable d={d} />
    </section>
  );
}
