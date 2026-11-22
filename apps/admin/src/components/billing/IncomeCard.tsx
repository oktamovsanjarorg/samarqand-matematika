import { formatSum, type IncomeMonth } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { csvTime, downloadCsv } from "../../lib/download";
import { tashkentToday } from "../../lib/groups";
import { ExportButton } from "../ExportButton";

const exportCsv = (m: IncomeMonth) =>
  downloadCsv(`Tushum ${m.month}`, [
    ["Tasdiqlangan", "Oʻquvchi", "Tarif", "Summa, soʻm"],
    ...m.rows.map((r) => [csvTime(r.approvedAt), r.student, r.plan, r.amountUzs]),
    [null, null, "Jami", m.sumUzs],
  ]);

/** Oylik tushum (T-109): faqat ustozga, tasdiqlangan cheklar bo'yicha */
export function IncomeCard() {
  const current = tashkentToday().slice(0, 7);
  const [month, setMonth] = useState(current);
  const q = useQuery({
    queryKey: ["income", month],
    queryFn: () => api.get<IncomeMonth>(`/admin/income?month=${month}`),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });
  const m = q.data;
  return (
    <section className="card space-y-2" aria-label="Oylik tushum">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Oylik tushum</h2>
        <div className="flex items-center gap-1">
          {m && m.count > 0 && <ExportButton onClick={() => exportCsv(m)} />}
          <input
            type="month"
            value={month}
            max={current}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Oy"
            className="min-h-11 rounded-xl border border-hint/25 bg-section px-3 text-sm"
          />
        </div>
      </div>
      {q.isPending && <div className="skeleton h-12" />}
      {q.error && <p className="text-sm text-danger">{q.error.message}</p>}
      {m && (
        <>
          <p data-testid="income-total">
            <span className="text-2xl font-extrabold tabular-nums text-brand">
              {formatSum(m.sumUzs)} soʻm
            </span>
            <span className="ml-2 text-sm text-hint">{m.count} ta toʻlov</span>
          </p>
          {m.byPlan.length > 0 && (
            <ul className="space-y-1 text-sm">
              {m.byPlan.map((p) => (
                <li key={p.name} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-hint">
                    {p.count} ta · {formatSum(p.sumUzs)} soʻm
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
