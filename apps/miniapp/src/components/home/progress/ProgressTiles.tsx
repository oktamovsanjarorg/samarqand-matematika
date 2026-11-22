import { MASTERY_PERCENT, type MyProgress } from "@samarqand/shared";
import { BookCheck, CalendarCheck, Target, Trophy, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-hint/15" aria-hidden>
      <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
    </div>
  );
}

function Tile(p: { Icon: LucideIcon; label: string; value: string; children?: ReactNode; to?: string }) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-sm text-hint">
        <p.Icon size={16} className="text-brand" aria-hidden /> {p.label}
      </p>
      <p className="text-xl font-extrabold tabular-nums">{p.value}</p>
      {p.children}
    </>
  );
  const cls = "card min-w-0 space-y-1.5";
  return p.to ? (
    <Link to={p.to} className={`tap ${cls}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** O'zlashtirish, aniqlik, haftalik o'rni va davomat (T-169) */
export function ProgressTiles({ p }: { p: MyProgress }) {
  const { topics, answers, weekly, attendance } = p;
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="progress-tiles">
      <Tile Icon={BookCheck} label="Mavzular" value={`${topics.mastered}/${topics.available}`} to="/lessons">
        <Bar value={pct(topics.mastered, topics.available)} />
        <p className="text-xs text-hint">
          {MASTERY_PERCENT}%+ natija · {topics.started} tasi boshlangan
        </p>
      </Tile>
      <Tile
        Icon={Target}
        label="Aniqlik"
        value={answers.checked ? `${pct(answers.correct, answers.checked)}%` : "—"}
      >
        <Bar value={pct(answers.correct, answers.checked)} />
        <p className="text-xs text-hint">
          {answers.correct}/{answers.checked} toʻgʻri javob
        </p>
      </Tile>
      {weekly && (
        <Tile Icon={Trophy} label="Haftalik" value={`${weekly.place}-oʻrin`} to="/weekly">
          <p className="truncate text-xs text-hint">
            {weekly.participants} kishidan · {weekly.title}
          </p>
        </Tile>
      )}
      {attendance && (
        <Tile Icon={CalendarCheck} label="Davomat" value={`${pct(attendance.present, attendance.total)}%`}>
          <Bar value={pct(attendance.present, attendance.total)} />
          <p className="text-xs text-hint">
            30 kunda {attendance.present}/{attendance.total} dars
          </p>
        </Tile>
      )}
    </div>
  );
}
