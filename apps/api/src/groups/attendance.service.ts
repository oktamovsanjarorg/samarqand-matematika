import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { AttendanceBody, AttendanceSheet, AttendanceStatus } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { personName, PERSON_SELECT } from "../common/person";
import { tashkentDayStart } from "../common/time";
import { attendanceParentText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

const MISSED: AttendanceStatus[] = ["ABSENT", "LATE"];
const dayOf = (date: string) => new Date(`${date}T00:00:00Z`);
const human = (date: string) => date.split("-").reverse().join(".");
/** Toshkent bo'yicha bugungi sana "YYYY-MM-DD" */
const today = (now: Date) =>
  new Date(tashkentDayStart(now).getTime() + 5 * 3600_000).toISOString().slice(0, 10);

/** Ota-onaga xabar kerakmi: kelmadi/kechikdi yangi holat, yoki oldin yuborilgan xabar tuzatiladi */
const needsNotice = (status: AttendanceStatus, notified: AttendanceStatus | null) =>
  status !== notified && (MISSED.includes(status) || notified !== null);

/** Davomat (T-055): guruh va kun bo'yicha belgilash, kelmagan yoki kechikkanning tasdiqlangan ota-onasiga xabar */
@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notify: NotifyService,
  ) {}

  async sheet(groupId: string, date: string): Promise<AttendanceSheet> {
    const g = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { students: { select: { userId: true, user: { select: PERSON_SELECT } } } },
    });
    if (!g) throw new NotFoundException("Guruh topilmadi");
    const marks = await this.prisma.attendance.findMany({
      where: { groupId, date: dayOf(date) },
      select: { userId: true, status: true, note: true },
    });
    const byUser = new Map(marks.map((m) => [m.userId, m]));
    const rows = g.students
      .map((s) => {
        const m = byUser.get(s.userId);
        return {
          userId: s.userId,
          name: personName(s.user),
          status: m?.status ?? null,
          note: m?.note ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return { date, rows };
  }

  async mark(
    actorId: string,
    groupId: string,
    body: AttendanceBody,
    now = new Date(),
  ): Promise<AttendanceSheet> {
    if (body.date > today(now)) throw new BadRequestException("Kelajak sanasiga davomat qoʻyilmaydi");
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
    if (!group) throw new NotFoundException("Guruh topilmadi");
    const userIds = [...new Set(body.marks.map((m) => m.userId))];
    const members = await this.prisma.studentProfile.count({ where: { userId: { in: userIds }, groupId } });
    if (members !== userIds.length) throw new BadRequestException("Baʼzi oʻquvchilar bu guruhda emas");
    const date = dayOf(body.date);
    const before = await this.prisma.attendance.findMany({
      where: { userId: { in: userIds }, date },
      select: { userId: true, notifiedStatus: true },
    });
    const notified = new Map(before.map((b) => [b.userId, b.notifiedStatus]));
    await this.prisma.$transaction(
      body.marks.map((m) => {
        const data = { groupId, status: m.status, note: m.note ?? null, markedById: actorId };
        return this.prisma.attendance.upsert({
          where: { userId_date: { userId: m.userId, date } },
          update: data,
          create: { ...data, userId: m.userId, date },
        });
      }),
    );
    await this.audit.log({
      actorId,
      action: "attendance.mark",
      entity: "Group",
      entityId: groupId,
      data: { date: body.date, count: body.marks.length },
    });
    const notices = body.marks.filter((m) => needsNotice(m.status, notified.get(m.userId) ?? null));
    await this.sendNotices(group.name, body.date, notices, notified);
    return this.sheet(groupId, body.date);
  }

  private async sendNotices(
    group: string,
    date: string,
    marks: { userId: string; status: AttendanceStatus }[],
    notified: Map<string, AttendanceStatus | null>,
  ) {
    if (!marks.length) return;
    const links = await this.prisma.parentLink.findMany({
      where: { status: "APPROVED", student: { userId: { in: marks.map((m) => m.userId) } } },
      select: { parentId: true, student: { select: { userId: true, user: { select: PERSON_SELECT } } } },
    });
    for (const m of marks) {
      const correction = (notified.get(m.userId) ?? null) !== null;
      const text = (child: string) =>
        attendanceParentText({ child, group, date: human(date), status: m.status, correction });
      const parents = links.filter((l) => l.student.userId === m.userId);
      await Promise.all(parents.map((l) => this.notify.toUser(l.parentId, text(personName(l.student.user)))));
      await this.prisma.attendance.update({
        where: { userId_date: { userId: m.userId, date: dayOf(date) } },
        data: { notifiedStatus: m.status },
      });
    }
  }
}
