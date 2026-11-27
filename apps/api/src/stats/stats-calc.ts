const DAY = 24 * 3600_000;
const TZ = 5 * 3600_000;

export const pct = (a: number, b: number): number | null => (b > 0 ? Math.round((a / b) * 100) : null);

/** Toshkent oyining [boshi, oxiri) UTC vaqtda */
export function monthRange(month: string): { from: Date; to: Date } {
  const [y = 0, m = 1] = month.split("-").map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1) - TZ), to: new Date(Date.UTC(y, m, 1) - TZ) };
}

export const currentMonth = (now = new Date()) => new Date(now.getTime() + TZ).toISOString().slice(0, 7);

/** Joriy Toshkent haftasining dushanbasi (00:00) va undan oldingi n-1 hafta, eskidan yangiga */
export function weekStarts(now: Date, n = 8): Date[] {
  const local = new Date(now.getTime() + TZ);
  const dow = (local.getUTCDay() + 6) % 7;
  const monday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow) - TZ;
  return Array.from({ length: n }, (_, i) => new Date(monday - (n - 1 - i) * 7 * DAY));
}

/** Vaqt qaysi haftaga tushadi (indeks yoki -1) */
export function weekIndex(starts: Date[], at: Date): number {
  const t = at.getTime();
  for (let i = starts.length - 1; i >= 0; i--) {
    const s = starts[i];
    if (s && t >= s.getTime()) return t < s.getTime() + 7 * DAY ? i : -1;
  }
  return -1;
}

export interface Mark {
  groupId: string;
  date: Date;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
}

/** Davomat: sababli kelmaganlar ham "belgilangan" hisobiga kiradi, kelganlar = PRESENT + LATE */
export function attendanceOf(marks: Mark[], groups: Map<string, string>) {
  const by = new Map<string, { days: Set<number>; came: number; all: number; absent: number }>();
  for (const m of marks) {
    const g = by.get(m.groupId) ?? { days: new Set<number>(), came: 0, all: 0, absent: 0 };
    g.days.add(m.date.getTime());
    g.all++;
    if (m.status === "PRESENT" || m.status === "LATE") g.came++;
    if (m.status === "ABSENT") g.absent++;
    by.set(m.groupId, g);
  }
  const rows = [...by.entries()].map(([groupId, g]) => ({
    groupId,
    name: groups.get(groupId) ?? "Guruh",
    days: g.days.size,
    rate: pct(g.came, g.all),
    absent: g.absent,
  }));
  const came = [...by.values()].reduce((s, g) => s + g.came, 0);
  return {
    rate: pct(came, marks.length),
    marks: marks.length,
    absent: rows.reduce((s, r) => s + r.absent, 0),
    byGroup: rows.sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101)),
  };
}

/** Eng yaxshilar: kamida min javob, foiz kamayish tartibida, teng bo'lsa javobi ko'p birinchi */
export function topOf(rows: { userId: string; ok: number; all: number }[], min: number, limit = 5) {
  const by = new Map<string, { ok: number; all: number }>();
  for (const r of rows) {
    const u = by.get(r.userId) ?? { ok: 0, all: 0 };
    u.all += r.all;
    u.ok += r.ok;
    by.set(r.userId, u);
  }
  return [...by.entries()]
    .filter(([, u]) => u.all >= min)
    .map(([userId, u]) => ({ userId, percent: pct(u.ok, u.all) ?? 0, answers: u.all }))
    .sort((a, b) => b.percent - a.percent || b.answers - a.answers)
    .slice(0, limit);
}
