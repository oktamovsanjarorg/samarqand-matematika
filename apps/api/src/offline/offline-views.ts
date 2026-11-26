import type {
  AdminOfflineResultRow,
  AdminOfflineTestDetail,
  AdminOfflineTestRow,
  OfflineRasch,
  OfflineSection,
} from "@samarqand/shared";
import { personName, PERSON_SELECT } from "../common/person";

const r1 = (x: number) => Math.round(x * 10) / 10;
const avg = (xs: number[]) => (xs.length ? r1(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

export const RESULT_SELECT = {
  id: true,
  line: true,
  name: true,
  phone: true,
  userId: true,
  user: { select: PERSON_SELECT },
  answers: true,
  correct: true,
  wrong: true,
  blank: true,
  percent: true,
  score: true,
  grade: true,
  notifiedAt: true,
} as const;

export const TEST_SELECT = {
  id: true,
  title: true,
  date: true,
  questionCount: true,
  scaleMax: true,
  notifiedAt: true,
  group: { select: { name: true } },
} as const;

/** Natijalar tartibi: ball, keyin foiz, keyin fayldagi qator */
export const RESULT_ORDER = [{ score: "desc" }, { percent: "desc" }, { line: "asc" }] as const;

type TestHead = {
  id: string;
  title: string;
  date: Date;
  questionCount: number;
  scaleMax: number;
  notifiedAt: Date | null;
  group: { name: string } | null;
};
type Score = { userId: string | null; percent: number; score: number };

export const day = (d: Date) => d.toISOString().slice(0, 10);

export function toRow(t: TestHead, rs: Score[]): AdminOfflineTestRow {
  return {
    id: t.id,
    title: t.title,
    date: day(t.date),
    groupName: t.group?.name ?? null,
    questionCount: t.questionCount,
    count: rs.length,
    matched: rs.filter((r) => r.userId).length,
    avgPercent: avg(rs.map((r) => r.percent)),
    avgScore: avg(rs.map((r) => r.score)),
    scaleMax: t.scaleMax,
    notifiedAt: t.notifiedAt?.toISOString() ?? null,
  };
}

type ResultRec = Omit<AdminOfflineResultRow, "rank" | "userName" | "notifiedAt"> & {
  notifiedAt: Date | null;
  user: Parameters<typeof personName>[0] | null;
};

/** Teng ballda o'rin bir xil (1, 2, 2, 4) */
export function ranked(rows: ResultRec[]): AdminOfflineResultRow[] {
  let rank = 0;
  return rows.map(({ user, notifiedAt, ...r }, i) => {
    if (i === 0 || r.score !== rows[i - 1]?.score) rank = i + 1;
    return {
      ...r,
      rank,
      userName: user ? personName(user) : null,
      notifiedAt: notifiedAt?.toISOString() ?? null,
    };
  });
}

function median(xs: number[]): number | null {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? null) : r1(((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2);
}

/** Tahlil: foiz taqsimoti, darajalar, har savol va bo'limlar o'rtachasi */
export function stats(
  rows: AdminOfflineResultRow[],
  sections: OfflineSection[],
  gradeLabels: string[],
  questionCount: number,
): AdminOfflineTestDetail["stats"] {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    label: i === 9 ? "90–100" : `${i * 10}–${i * 10 + 9}`,
    count: 0,
  }));
  for (const r of rows) {
    const b = buckets[Math.min(9, Math.floor(r.percent / 10))];
    if (b) b.count++;
  }
  const n = rows.length || 1;
  const share = (q: number, marks: string[]) =>
    r1((rows.filter((r) => marks.includes(r.answers[q - 1] ?? "-")).length / n) * 100);
  const questions = Array.from({ length: questionCount }, (_, i) => ({
    q: i + 1,
    correctPct: share(i + 1, ["c"]),
    blankPct: share(i + 1, ["b", "-"]),
  }));
  const pct = new Map(questions.map((x) => [x.q, x.correctPct]));
  return {
    median: median(rows.map((r) => r.percent)),
    buckets,
    grades: [...gradeLabels, null].map((g) => ({
      label: g ?? "Darajasiz",
      count: rows.filter((r) => r.grade === g).length,
    })),
    questions,
    sections: sections.map((s) => ({
      title: s.title,
      questions: s.questions,
      avgPercent: avg(s.questions.map((q) => pct.get(q) ?? 0)) ?? 0,
    })),
  };
}

export const asSections = (v: unknown) => (Array.isArray(v) ? (v as OfflineSection[]) : []);
export const asRasch = (v: unknown, questionCount: number): OfflineRasch =>
  v && typeof v === "object" && "items" in v
    ? (v as OfflineRasch)
    : {
        calibrated: false,
        n: 0,
        items: Array.from({ length: questionCount }, (_, i) => ({ q: i + 1, b: 0, w: 1, correctPct: 0 })),
      };
