import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Ticker } from "../common/ticker";
import { gradeOf } from "@samarqand/shared";
import { ENV, type Env } from "../config/env";
import { AccessService } from "../access/access.service";
import { PERSON_SELECT, personName } from "../common/person";
import { mockOpenText, mockParentReport, mockReminderText, mockResultText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { snapshotOf } from "./admin-mocks.service";
import { scoreMock, type ScoredAttempt } from "./mock-scoring";
import { MocksService } from "./mocks.service";

const HOUR = 3_600_000;

/** Mock yopilishi (T-053): vaqti o'tganlar topshiriladi, shkala balli qo'yiladi, o'quvchiga natija xabari */
/** Urinish → Rasch qatori (savollar tartibida, to'g'ri = 1); xodim sinovi belgilanadi (T-087) */
function toScored(
  a: {
    id: string;
    raw: number | null;
    user: { role: string };
    answers: { questionId: string; result: string | null }[];
  },
  ids: string[],
): ScoredAttempt {
  const correct = new Set(a.answers.filter((x) => x.result === "CORRECT").map((x) => x.questionId));
  const row = ids.map((q) => (correct.has(q) ? 1 : 0) as 0 | 1);
  return { id: a.id, raw: a.raw ?? 0, row, staff: a.user.role !== "STUDENT" };
}

@Injectable()
export class MockScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("Mock");
  private readonly ticker = new Ticker(this.log);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mocks: MocksService,
    private readonly notify: NotifyService,
    private readonly access: AccessService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit() {
    this.ticker.start(this.env.WEEKLY_TICK_SEC, async () => {
      const now = new Date();
      await this.announce(now);
      await this.remind(now);
      await this.close(now);
    });
  }

  onModuleDestroy() {
    return this.ticker.stop();
  }

  /** Mock ochildi: to'liq kirishli o'quvchilarga bir marta xabar (T-080) */
  async announce(now: Date) {
    const due = await this.prisma.mockTest.findMany({
      where: { isPublished: true, announcedAt: null, opensAt: { lte: now }, closesAt: { gt: now } },
      select: { id: true, title: true, closesAt: true },
    });
    for (const t of due) {
      const claimed = await this.prisma.mockTest.updateMany({
        where: { id: t.id, announcedAt: null },
        data: { announcedAt: now },
      });
      if (!claimed.count) continue;
      const to = await this.access.fullAccessStudentIds();
      const open = this.notify.appButton("Mockni ochish", `mocks/${t.id}`);
      await Promise.all(to.map((id) => this.notify.toUser(id, mockOpenText(t.title, t.closesAt), open)));
    }
  }

  /**
   * Yopilishiga 24 soat qolganda topshirmagan to'liq kirishli o'quvchilarga bir marta eslatma (T-118).
   * Kamida 12 soat ochiq turgan mock uchun: qisqa oynada "ochildi" xabaridan keyin darhol ikkinchisi ketmasin.
   */
  async remind(now: Date) {
    const due = await this.prisma.mockTest.findMany({
      where: {
        isPublished: true,
        remindedAt: null,
        opensAt: { lte: new Date(now.getTime() - 12 * HOUR) },
        closesAt: { gt: now, lte: new Date(now.getTime() + 24 * HOUR) },
      },
      select: { id: true, title: true, closesAt: true },
    });
    for (const t of due) {
      const claimed = await this.prisma.mockTest.updateMany({
        where: { id: t.id, remindedAt: null },
        data: { remindedAt: now },
      });
      if (!claimed.count) continue;
      const done = await this.prisma.mockAttempt.findMany({
        where: { mockTestId: t.id, submittedAt: { not: null } },
        select: { userId: true },
      });
      const skip = new Set(done.map((d) => d.userId));
      const to = (await this.access.fullAccessStudentIds()).filter((id) => !skip.has(id));
      const open = this.notify.appButton("Mockni ochish", `mocks/${t.id}`);
      const text = mockReminderText(t.title, t.closesAt);
      await Promise.all(to.map((id) => this.notify.toUser(id, text, open)));
    }
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
            user: { select: { role: true } },
            answers: { select: { questionId: true, result: true } },
          },
        },
      },
    });
    const t = snapshotOf(m.template);
    const ids = m.questions.map((q) => q.questionId);
    const s = scoreMock(
      t,
      m.attempts.map((a) => toScored(a, ids)),
    );
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
    const results = new Map(
      m.attempts.map((a) => {
        const scaled = s.scaled.get(a.id) ?? 0;
        const r = {
          scaled,
          scaleMax: t.scaleMax,
          grade: gradeOf(scaled, t.grades),
          approx: s.raschN === null,
        };
        return [a.userId, r] as const;
      }),
    );
    await Promise.all(
      [...results].map(([userId, r]) =>
        this.notify.toUser(
          userId,
          mockResultText(m.title, r),
          this.notify.appButton("Natijani koʻrish", `mocks/${id}`),
        ),
      ),
    );
    await this.reportParents(m.title, results);
  }

  /** Tasdiqlangan ota-onalarga farzandining natijasi (T-082) */
  private async reportParents(title: string, results: Map<string, Parameters<typeof mockParentReport>[2]>) {
    const links = await this.prisma.parentLink.findMany({
      where: { status: "APPROVED", student: { userId: { in: [...results.keys()] } } },
      select: { parentId: true, student: { select: { userId: true, user: { select: PERSON_SELECT } } } },
    });
    await Promise.all(
      links.map((l) => {
        const r = results.get(l.student.userId);
        return r
          ? this.notify.toUser(l.parentId, mockParentReport(personName(l.student.user), title, r))
          : null;
      }),
    );
  }
}
