import { Injectable } from "@nestjs/common";
import { rankRows } from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { weeklyParentReport } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { personName, PERSON_SELECT, scoreOf } from "./weekly-views";

/**
 * Ota-onaga hisobot (T-035b): oyna yopilganda tasdiqlangan ota-onalarga ball va o'rin.
 * To'liq kirishli, lekin ishlamagan o'quvchining ota-onasiga "topshirmadi" (BR-W03).
 */
@Injectable()
export class ParentReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notify: NotifyService,
  ) {}

  async send(test: { id: string; title: string; total: number }) {
    const attempts = await this.prisma.weeklyAttempt.findMany({
      where: { weeklyTestId: test.id },
      select: {
        userId: true,
        score: true,
        submittedAt: true,
        correct: true,
        user: { select: PERSON_SELECT },
      },
    });
    const ranked = rankRows(
      attempts.map((a) => ({
        userId: a.userId,
        name: personName(a.user),
        score: scoreOf(a),
        submitted: !!a.submittedAt,
      })),
    );
    const byUser = new Map(ranked.map((r) => [r.userId, r]));
    const userIds = [...new Set([...byUser.keys(), ...(await this.access.fullAccessStudentIds())])];
    const links = await this.prisma.parentLink.findMany({
      where: { status: "APPROVED", student: { userId: { in: userIds } } },
      select: { parentId: true, student: { select: { userId: true, user: { select: PERSON_SELECT } } } },
    });
    await Promise.all(
      links.map((l) => {
        const r = byUser.get(l.student.userId);
        const result = r?.submitted
          ? { score: r.score, total: test.total, place: r.place, participants: ranked.length }
          : null;
        return this.notify.toUser(
          l.parentId,
          weeklyParentReport(personName(l.student.user), test.title, result),
        );
      }),
    );
  }
}
