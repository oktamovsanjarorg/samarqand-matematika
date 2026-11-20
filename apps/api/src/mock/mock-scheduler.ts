import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { gradeOf } from "@samarqand/shared";
import { ENV, type Env } from "../config/env";
import { mockResultText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { snapshotOf } from "./admin-mocks.service";
import { scoreMock } from "./mock-scoring";
import { MocksService } from "./mocks.service";

/** Mock yopilishi (T-053): vaqti o'tganlar topshiriladi, shkala balli qo'yiladi, o'quvchiga natija xabari */
@Injectable()
export class MockScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("Mock");
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mocks: MocksService,
    private readonly notify: NotifyService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit() {
    if (this.env.WEEKLY_TICK_SEC === 0) return;
    this.timer = setInterval(() => {
      this.close(new Date()).catch((e: unknown) =>
        this.log.warn(`close: ${e instanceof Error ? e.name : "xato"}`),
      );
    }, this.env.WEEKLY_TICK_SEC * 1000);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async close(now: Date) {
    const due = await this.prisma.mockTest.findMany({
      where: { isPublished: true, closedAt: null, closesAt: { lte: now } },
      select: { id: true },
    });
    for (const m of due) {
      const claimed = await this.prisma.mockTest.updateMany({
        where: { id: m.id, closedAt: null },
        data: { closedAt: now },
      });
      if (!claimed.count) continue;
      await this.mocks.finalizeExpired({ mockTestId: m.id }, now);
      await this.score(m.id);
    }
  }

  private async score(id: string) {
    const m = await this.prisma.mockTest.findUniqueOrThrow({
      where: { id },
      select: {
        title: true,
        template: true,
        questions: { orderBy: { order: "asc" }, select: { questionId: true } },
        attempts: {
          where: { submittedAt: { not: null } },
          select: {
            id: true,
            userId: true,
            raw: true,
            answers: { select: { questionId: true, result: true } },
          },
        },
      },
    });
    const t = snapshotOf(m.template);
    const ids = m.questions.map((q) => q.questionId);
    const attempts = m.attempts.map((a) => {
      const correct = new Set(a.answers.filter((x) => x.result === "CORRECT").map((x) => x.questionId));
      return { id: a.id, raw: a.raw ?? 0, row: ids.map((q) => (correct.has(q) ? 1 : 0) as 0 | 1) };
    });
    const s = scoreMock(t, attempts);
    await this.prisma.$transaction([
      this.prisma.mockTest.update({ where: { id }, data: { raschN: s.raschN } }),
      ...[...s.scaled].map(([attemptId, scaled]) =>
        this.prisma.mockAttempt.update({ where: { id: attemptId }, data: { scaled } }),
      ),
      ...(s.b ?? []).map((b, i) =>
        this.prisma.mockQuestion.update({
          where: { mockTestId_questionId: { mockTestId: id, questionId: ids[i] ?? "" } },
          data: { raschB: b },
        }),
      ),
    ]);
    await Promise.all(
      m.attempts.map((a) => {
        const scaled = s.scaled.get(a.id) ?? 0;
        return this.notify.toUser(
          a.userId,
          mockResultText(m.title, { scaled, scaleMax: t.scaleMax, grade: gradeOf(scaled, t.grades) }),
        );
      }),
    );
  }
}
