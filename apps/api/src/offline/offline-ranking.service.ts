import { Injectable, NotFoundException } from "@nestjs/common";
import type { OfflineRankingRow } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { personName, PERSON_SELECT } from "../common/person";
import { offlineParentReport, offlineResultText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

const r1 = (x: number) => Math.round(x * 10) / 10;
const DAY = 86_400_000;

/** Offline testlar bo'yicha reyting va natija xabarlari (T-181) */
@Injectable()
export class OfflineRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
    private readonly audit: AuditService,
  ) {}

  /** Moslangan o'quvchilar: o'rtacha ball bo'yicha; days = 0 bo'lsa hammasi */
  async ranking(days: number, now = new Date()): Promise<OfflineRankingRow[]> {
    const since = days > 0 ? new Date(now.getTime() - days * DAY) : undefined;
    const rows = await this.prisma.offlineResult.findMany({
      where: { userId: { not: null }, offlineTest: since ? { date: { gte: since } } : {} },
      orderBy: [{ offlineTest: { date: "asc" } }, { offlineTest: { createdAt: "asc" } }],
      select: {
        userId: true,
        percent: true,
        score: true,
        user: {
          select: {
            ...PERSON_SELECT,
            student: { select: { fullName: true, group: { select: { name: true } } } },
          },
        },
      },
    });
    const by = new Map<string, OfflineRankingRow & { sumP: number; sumS: number }>();
    for (const r of rows) {
      if (!r.userId || !r.user) continue;
      const cur = by.get(r.userId) ?? {
        userId: r.userId,
        name: personName(r.user),
        groupName: r.user.student?.group?.name ?? null,
        tests: 0,
        avgPercent: 0,
        avgScore: 0,
        best: 0,
        last: 0,
        sumP: 0,
        sumS: 0,
      };
      cur.tests++;
      cur.sumP += r.percent;
      cur.sumS += r.score;
      cur.best = Math.max(cur.best, r.score);
      cur.last = r.score;
      by.set(r.userId, cur);
    }
    return [...by.values()]
      .map(({ sumP, sumS, ...x }) => ({ ...x, avgPercent: r1(sumP / x.tests), avgScore: r1(sumS / x.tests) }))
      .sort((a, b) => b.avgScore - a.avgScore || b.tests - a.tests);
  }

  /** Hali xabar olmagan moslangan o'quvchilarga va ularning tasdiqlangan ota-onalariga */
  async sendNotices(actorId: string, id: string): Promise<{ students: number; parents: number }> {
    const t = await this.prisma.offlineTest.findUnique({
      where: { id },
      select: {
        title: true,
        scaleMax: true,
        results: { select: { id: true, userId: true, score: true, grade: true, notifiedAt: true } },
      },
    });
    if (!t) throw new NotFoundException("Test topilmadi");
    const place = (score: number) => t.results.filter((x) => x.score > score).length + 1;
    const todo = t.results.filter((r) => r.userId && !r.notifiedAt);
    let students = 0;
    let parents = 0;
    for (const r of todo) {
      if (!r.userId) continue;
      const msg = {
        score: r.score,
        scaleMax: t.scaleMax,
        grade: r.grade,
        place: place(r.score),
        participants: t.results.length,
      };
      const button = this.notify.appButton("Natijani ochish", `offline/${r.id}`);
      if (await this.notify.toUser(r.userId, offlineResultText(t.title, msg), button)) students++;
      parents += await this.toParents(r.userId, t.title, msg, button);
    }
    const now = new Date();
    await this.prisma.offlineResult.updateMany({
      where: { id: { in: todo.map((r) => r.id) } },
      data: { notifiedAt: now },
    });
    await this.prisma.offlineTest.update({ where: { id }, data: { notifiedAt: now } });
    await this.audit.log({
      actorId,
      action: "offline.notify",
      entity: "OfflineTest",
      entityId: id,
      data: { students, parents },
    });
    return { students, parents };
  }

  private async toParents(
    userId: string,
    title: string,
    msg: Parameters<typeof offlineParentReport>[2],
    button: ReturnType<NotifyService["appButton"]>,
  ): Promise<number> {
    const links = await this.prisma.parentLink.findMany({
      where: { status: "APPROVED", student: { userId } },
      select: { parentId: true, student: { select: { user: { select: PERSON_SELECT } } } },
    });
    const sent = await Promise.all(
      links.map((l) =>
        this.notify.toUser(l.parentId, offlineParentReport(personName(l.student.user), title, msg), button),
      ),
    );
    return sent.filter(Boolean).length;
  }
}
