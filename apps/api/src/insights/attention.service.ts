import { attemptPercents } from "../common/answer-stats";
import { Injectable } from "@nestjs/common";
import { ABSENT_WINDOW_DAYS, type AttentionRow } from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { personName, PERSON_SELECT } from "../common/person";
import { PrismaService } from "../prisma/prisma.service";
import { attentionReasons } from "./attention";

const DAY = 24 * 3600_000;

/** Ustozga: e'tibor kerak o'quvchilar (T-063, BR-R02). Faqat qabul qilingan o'quvchilar */
@Injectable()
export class AttentionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Bitta o'quvchining sabablari (T-068 kartasi uchun) */
  async forStudent(userId: string, now = new Date()) {
    return (await this.list(now, userId))[0]?.reasons ?? [];
  }

  async list(now = new Date(), onlyId?: string): Promise<AttentionRow[]> {
    const students = await this.prisma.user.findMany({
      where: {
        role: "STUDENT",
        isBlocked: false,
        student: { acceptedAt: { not: null } },
        ...(onlyId ? { id: onlyId } : {}),
      },
      select: {
        id: true,
        phone: true,
        createdAt: true,
        lastSeenAt: true,
        ...PERSON_SELECT,
        student: { select: { fullName: true, group: { select: { name: true } } } },
      },
    });
    const ids = students.map((s) => s.id);
    const [percents, absences, missed] = await Promise.all([
      this.percents(ids, now),
      this.absences(ids, now),
      this.missedWeekly(now),
    ]);
    const rows = students.map((s) => ({
      userId: s.id,
      name: personName(s),
      phone: s.phone,
      groupName: s.student?.group?.name ?? null,
      reasons: attentionReasons(
        {
          lastSeenAt: s.lastSeenAt ?? s.createdAt,
          percents: percents.get(s.id) ?? [],
          absences: absences.get(s.id) ?? 0,
          missedWeekly: missed && missed.userIds.has(s.id) ? missed.title : null,
        },
        now,
      ),
    }));
    return rows
      .filter((r) => r.reasons.length)
      .sort((a, b) => b.reasons.length - a.reasons.length || a.name.localeCompare(b.name));
  }

  /** Oxirgi 60 kundagi mavzu testlari foizi (faqat avtomatik tekshirilganlar), eskidan yangiga; bazada sanaladi (T-189) */
  private percents(ids: string[], now: Date) {
    return attemptPercents(this.prisma, ids, new Date(now.getTime() - 60 * DAY));
  }

  private async absences(ids: string[], now: Date) {
    const rows = await this.prisma.attendance.groupBy({
      by: ["userId"],
      where: {
        userId: { in: ids },
        status: "ABSENT",
        date: { gte: new Date(now.getTime() - ABSENT_WINDOW_DAYS * DAY) },
      },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.userId, r._count._all]));
  }

  /** Oxirgi yopilgan haftalik: to'liq kirishi bor, lekin topshirmaganlar */
  private async missedWeekly(now: Date) {
    const t = await this.prisma.weeklyTest.findFirst({
      where: { isPublished: true, closesAt: { lte: now } },
      orderBy: { closesAt: "desc" },
      select: {
        id: true,
        title: true,
        opensAt: true,
        attempts: { where: { submittedAt: { not: null } }, select: { userId: true } },
      },
    });
    if (!t || now.getTime() - t.opensAt.getTime() > 30 * DAY) return null;
    const done = new Set(t.attempts.map((a) => a.userId));
    const full = await this.access.fullAccessStudentIds();
    return { title: t.title, userIds: new Set(full.filter((id) => !done.has(id))) };
  }
}
