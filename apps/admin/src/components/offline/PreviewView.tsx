import type { OfflinePreview } from "@samarqand/shared";
import { Badge } from "../ui";
import { ScoresTable } from "./ScoresTable";

const BY = { phone: "telefon", name: "ism" } as const;

/** Saqlashdan oldin: savol soni, ball usuli, kim kimga moslandi */
export function PreviewView({ p }: { p: OfflinePreview }) {
  const matched = p.rows.filter((r) => r.match).length;
  return (
    <div className="space-y-2" data-testid="offline-preview">
      <p className="text-sm">
        {p.rows.length} qator, {matched} tasi oʻquvchiga moslandi. Qolganini saqlagandan keyin biriktirasiz.
      </p>
      <p className="text-xs text-hint">
        {p.format === "omr" ? "Skaner eksporti" : "Q1..Qn jadval"} · {p.questionCount} savol · ball{" "}
        {p.scaleMax} dan (Rasch
        {p.calibrated ? ", savol qiyinligi hisobga olindi" : ": qatnashchi 30 dan kam, savollar teng"})
      </p>
      <ScoresTable
        rows={p.rows.map((r) => ({ ...r, key: String(r.line) }))}
        student={(r) => {
          const m = p.rows.find((x) => x.line === r.line)?.match;
          return m ? <Badge tone="success">{`${m.name} (${BY[m.by]})`}</Badge> : <Badge>Moslanmadi</Badge>;
        }}
      />
    </div>
  );
}
