import { weakestSection, type StudentOfflineDetail } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Award, Users } from "lucide-react";
import { useParams } from "react-router-dom";
import { ErrorState } from "../components/states";
import { useBackButton } from "../hooks/useBackButton";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
const day = (d: string) => d.split("-").reverse().join(".");
const CELL: Record<string, string> = {
  c: "bg-success/15 text-success",
  w: "bg-danger/15 text-danger",
};

function Summary({ r }: { r: StudentOfflineDetail }) {
  return (
    <div className="card space-y-3 text-center" data-testid="offline-summary">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-brand/10 p-3">
          <p className="text-[11px] text-hint">Ball</p>
          <p className="text-2xl font-extrabold tabular-nums text-brand">{num(r.score)}</p>
          <p className="text-[11px] text-hint">{r.scaleMax} dan</p>
        </div>
        <div className="rounded-xl bg-hint/10 p-3">
          <p className="text-[11px] text-hint">Foiz</p>
          <p className="text-2xl font-extrabold tabular-nums">{num(r.percent)}%</p>
        </div>
        <div className="rounded-xl bg-hint/10 p-3">
          <p className="text-[11px] text-hint">Daraja</p>
          <p className="text-2xl font-extrabold">{r.grade ?? "—"}</p>
        </div>
      </div>
      <p className="text-sm text-hint">
        {r.correct} toʻgʻri · {r.wrong} xato · {r.blank} boʻsh · {r.questionCount} savol
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-brand/10 p-3">
          <Award size={18} className="mx-auto text-brand" />
          <p className="mt-1 font-extrabold">
            {r.place}-oʻrin <span className="font-normal text-hint">/ {r.participants}</span>
          </p>
        </div>
        <div className="rounded-xl bg-hint/10 p-3">
          <Users size={18} className="mx-auto text-hint" />
          <p className="mt-1 font-extrabold">
            {num(r.avgPercent)}% <span className="font-normal text-hint">oʻrtacha</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Sections({ r }: { r: StudentOfflineDetail }) {
  if (!r.sections.length) return null;
  const weak = weakestSection(r.sections);
  return (
    <section className="space-y-2">
      <h2 className="font-bold">Fan boʻlimlari</h2>
      <div className="card space-y-3" data-testid="offline-sections">
        {r.sections.map((s) => (
          <div key={s.title}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="font-semibold">{s.title}</span>
              <span className="shrink-0 tabular-nums text-hint">
                {s.correct}/{s.max} · <b className="text-text">{num(s.points)}</b> ball
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-hint/15">
              <div
                className={`h-full rounded-full ${s.percent >= 60 ? "bg-brand" : "bg-danger"}`}
                style={{ width: `${s.percent}%` }}
              />
            </div>
          </div>
        ))}
        {weak && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            Eng zaif boʻlim: <b>{weak.title}</b> · {weak.correct}/{weak.max}. Shu mavzularni takrorlang.
          </p>
        )}
      </div>
    </section>
  );
}

function Questions({ r }: { r: StudentOfflineDetail }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold">Har savol</h2>
      <div className="card space-y-3">
        <div className="grid grid-cols-6 gap-1.5" data-testid="offline-answers">
          {[...r.answers].map((a, i) => (
            <span
              key={i}
              className={`rounded-lg py-1.5 text-center text-xs font-bold tabular-nums ${CELL[a] ?? "bg-hint/10 text-hint"}`}
            >
              {i + 1}
              <span className="block text-[10px] font-semibold opacity-80">
                {a === "c" ? num(r.points[i] ?? 0) : a === "w" ? "✕" : "–"}
              </span>
            </span>
          ))}
        </div>
        <p className="flex flex-wrap gap-3 text-xs text-hint">
          <span>
            <b className="text-success">■</b> toʻgʻri (ostida olingan ball)
          </span>
          <span>
            <b className="text-danger">■</b> xato
          </span>
          <span>
            <b className="text-hint">■</b> boʻsh
          </span>
        </p>
      </div>
    </section>
  );
}

/** Offline test natijasi: ball, daraja, o'rin, fan bo'limlari, har savol (T-184). Ota-ona ham ko'radi */
export function OfflineResultPage() {
  const { id = "" } = useParams();
  const parent = useAuth((s) => s.user?.role === "PARENT");
  useBackButton(parent ? "/" : "/mocks");
  const q = useQuery({
    queryKey: ["offline-result", id],
    queryFn: () => api<StudentOfflineDetail>(`/me/offline-results/${id}`),
  });
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  if (!q.data) return <div className="skeleton h-60" aria-busy="true" />;
  const r = q.data;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-hint">Offline test · {day(r.date)}</p>
        <h1 className="text-xl font-extrabold">{r.title}</h1>
      </div>
      <Summary r={r} />
      <Sections r={r} />
      <Questions r={r} />
    </div>
  );
}
