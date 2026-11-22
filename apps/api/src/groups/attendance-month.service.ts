import { Injectable, NotFoundException } from "@nestjs/common";
import { ATTENDANCE_STATUSES, type AttendanceMonth, type AttendanceStatus } from "@samarqand/shared";
import { personName, PERSON_SELECT } from "../common/person";
import { PrismaService } from "../prisma/prisma.service";

type Row = AttendanceMonth["rows"][number];
const zero = () => Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s, 0])) as Row["counts"];

/** Oy chegaralari: [1-kun, keyingi oyning 1-kuni) — @db.Date ustunlari UTC yarim tunda */
function bounds(month: string): { gte: Date; lt: Date } {
  const [y = 0, m = 0] = month.split("-").map(Number);
  return { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
}

/**
 * Oylik davomat jadvali (T-108): o'quvchi × kun, jami sonlar bilan.
 * Guruhdan chiqqan, lekin shu oyda belgisi bor o'quvchi ham ko'rinadi: jurnal o'zgarmasligi kerak.
 */
@Injectable()
export class AttendanceMonthService {
  constructor(private readonly prisma: PrismaService) {}

  async get(groupId: string, month: string): Promise<AttendanceMonth> {
    const g = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { students: { select: { userId: true, user: { select: PERSON_SELECT } } } },
    });
    if (!g) throw new NotFoundException("Guruh topilmadi");
    const marks = await this.prisma.attendance.findMany({
      where: { groupId, date: bounds(month) },
      select: { userId: true, date: true, status: true, user: { select: PERSON_SELECT } },
      orderBy: { date: "asc" },
    });
    const rows = new Map<string, Row>();
    const row = (userId: string, name: string, left: boolean) => {
      const r = rows.get(userId) ?? { userId, name, left, marks: {}, counts: zero() };
      rows.set(userId, r);
      return r;
    };
    for (const s of g.students) row(s.userId, personName(s.user), false);
    const dates = new Set<string>();
    for (const m of marks) {
      const date = m.date.toISOString().slice(0, 10);
      dates.add(date);
      const r = row(m.userId, personName(m.user), true);
      r.marks[date] = m.status as AttendanceStatus;
      r.counts[m.status as AttendanceStatus] += 1;
    }
    return {
      month,
      dates: [...dates],
      rows: [...rows.values()].sort(
        (a, b) => Number(a.left) - Number(b.left) || a.name.localeCompare(b.name),
      ),
    };
  }
}
