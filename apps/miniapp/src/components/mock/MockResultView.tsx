import type { MockResult } from "@samarqand/shared";
import { Link } from "react-router-dom";
import { ResultItem } from "../test/ResultItem";

const backLink = "tap flex h-12 items-center justify-center rounded-xl border border-hint/25 font-semibold";

/** Bo'limlar bo'yicha: to'g'rilar va xom ball */
function Sections({ r }: { r: MockResult }) {
  return (
    <section className="card space-y-2" data-testid="mock-sections">
      <h2 className="font-bold">Boʻlimlar</h2>
      <ul className="divide-y divide-hint/10">
        {r.sections.map((s) => (
          <li key={s.title} className="flex items-center gap-2 py-2 text-sm">
            <span className="min-w-0 flex-1">{s.title}</span>
            <span className="text-hint">
              {s.correct}/{s.total}
            </span>
            <b className="w-20 text-right tabular-nums">
              {s.raw}/{s.maxRaw}
            </b>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Oyna yopilgach: shkala balli (taxminiy, BR-M05), daraja, bo'limlar va savollar */
export function MockResultView({ r }: { r: MockResult }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Natija</h1>
      <div className="card space-y-1 text-center" data-testid="mock-score">
        <p className="text-sm text-hint">{r.title}</p>
        <p className="text-4xl font-extrabold text-brand">
          {r.scaled}
          <span className="text-lg text-hint">/{r.scaleMax}</span>
        </p>
        <p className="text-lg font-bold">{r.grade ? `Daraja: ${r.grade}` : "Daraja yoʻq"}</p>
        <p className="text-sm text-hint">
          {r.submittedAt ? `Xom ball ${r.raw}/${r.maxRaw}` : "Mock ishlanmagan: 0 ball"}
          {r.approx && " · taxminiy baho (ishtirokchilar kam)"}
        </p>
      </div>
      <Sections r={r} />
      <ol className="space-y-3">
        {r.items.map((item, i) => (
          <ResultItem key={item.question.id} item={item} n={i + 1}>
            <p className="text-sm text-hint">
              {r.sections[item.section]?.title} · {item.points} ball
            </p>
          </ResultItem>
        ))}
      </ol>
      <Link to="/mocks" className={backLink}>
        Mocklar
      </Link>
    </div>
  );
}
