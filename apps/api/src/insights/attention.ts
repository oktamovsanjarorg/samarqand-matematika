import { ABSENT_MIN, DROP_POINTS, INACTIVE_DAYS, type AttentionReason } from "@samarqand/shared";

export interface StudentFacts {
  /** Oxirgi kirish; hech kirmagan bo'lsa ro'yxatdan o'tgan vaqt */
  lastSeenAt: Date;
  /** Mavzu testlari foizi, eskidan yangiga */
  percents: number[];
  absences: number;
  /** Oxirgi yopilgan haftalik: to'liq kirishi bor, lekin topshirmagan; test nomi */
  missedWeekly: string | null;
}

const DAY = 24 * 3600_000;
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Oxirgi 3 test o'rtachasi undan oldingi 3 tadan kamida 20 punkt past */
function drop(percents: number[]): AttentionReason | null {
  if (percents.length < 6) return null;
  const before = Math.round(avg(percents.slice(-6, -3)));
  const last = Math.round(avg(percents.slice(-3)));
  return before - last >= DROP_POINTS
    ? { code: "DROP", text: `Mavzu testlari: oldin ${before}%, oxirgi 3 tasida ${last}%` }
    : null;
}

/** BR-R02: faqat faktlar, har sabab izohi bilan */
export function attentionReasons(f: StudentFacts, now: Date): AttentionReason[] {
  const out: AttentionReason[] = [];
  const idle = Math.floor((now.getTime() - f.lastSeenAt.getTime()) / DAY);
  if (idle >= INACTIVE_DAYS) out.push({ code: "INACTIVE", text: `${idle} kundan beri ilovaga kirmagan` });
  const d = drop(f.percents);
  if (d) out.push(d);
  if (f.absences >= ABSENT_MIN)
    out.push({ code: "ABSENT", text: `Oxirgi 14 kunda ${f.absences} marta darsga kelmagan` });
  if (f.missedWeekly)
    out.push({ code: "MISSED_WEEKLY", text: `“${f.missedWeekly}” haftalik testini topshirmagan` });
  return out;
}
