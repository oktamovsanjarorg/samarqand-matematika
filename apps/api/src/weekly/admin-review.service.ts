import { topicAttemptChecks } from "../common/answer-stats";
import { countMap } from "../common/count-map";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  awaySignal,
  percentOf,
  type CheckResult,
  suggestedPoints,
  type GradeInput,
  type ReviewItem,
  type ReviewQueue,
  type SolutionVerdict,
} from "@samarqand/shared";
import type { Prisma } from "@samarqand/db";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { toDetail, toView } from "../questions/codec";
import { averagePercent } from "../topic-tests/stats";
import { historyJump, sameWrongAnswers } from "./signals";
import { personName, PERSON_SELECT } from "../common/person";
import { answerPoints } from "./weekly-views";

const ANSWER_INCLUDE = {
  question: true,
  photos: { select: { id: true }, orderBy: { createdAt: "asc" } },
  aiReview: { select: { status: true, suspected: true, verdict: true } },
  reviewedBy: { select: { firstName: true, lastName: true } },
} as const;

/** Navbat tartibi: shubhali va hal qilinmagan birinchi, keyin hal qilinmagan, keyin hal qilingan */
const rank = (i: ReviewItem) =>
  i.decision
    ? 2
    : i.ai?.suspected || i.signals.sameWrong > 0 || i.signals.historyJump || i.signals.away
      ? 0
      : 1;

type AttemptRow = {
  id: string;
  userId: string;
  awayCount: number;
  awayMs: number;
  user: { firstName: string; lastName: string | null; student: { fullName: string | null } | null };
};
type AnswerRow = Prisma.WeeklyAnswerGetPayload<{ include: typeof ANSWER_INCLUDE }>;

function toItem(a: AttemptRow, x: AnswerRow, sig: { group?: string[]; jump: boolean }): ReviewItem {
  const verdict = x.aiReview?.status === "DONE" ? (x.aiReview.verdict as SolutionVerdict) : null;
  const detail = toDetail(x.question);
  return {
    attemptId: a.id,
    questionId: x.questionId,
    order: x.order,
    student: { userId: a.userId, name: personName(a.user) },
    question: toView(x.question),
    response: x.response,
    correctAnswer: "answer" in detail ? detail.answer : null,
    autoResult: x.result,
    autoPoints: answerPoints({ teacherPoints: null, result: x.result, photos: x.photos.length }),
    photos: x.photos.map((p) => p.id),
    ai: x.aiReview && {
      status: x.aiReview.status,
      suspected: x.aiReview.suspected,
      verdict,
      suggested: verdict ? suggestedPoints(verdict) : null,
    },
    signals: {
      sameWrong: sig.group ? sig.group.length - 1 : 0,
      historyJump: sig.jump,
      away: awaySignal(a.awayCount, a.awayMs),
    },
    decision:
      x.teacherPoints === null || !x.reviewedAt
        ? null
        : {
            points: x.teacherPoints,
            note: x.teacherNote,
            reviewedAt: x.reviewedAt.toISOString(),
            reviewer: x.reviewedBy?.firstName ?? "",
          },
  };
}

/** Ustoz navbati (T-034, BR-W05, W06): AI hukmi va signallar faqat shu yerda ko'rinadi */
@Injectable()
export class AdminReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async queue(testId: string): Promise<ReviewQueue> {
    const t = await this.prisma.weeklyTest.findUnique({
      where: { id: testId },
      select: { id: true, title: true, closesAt: true },
    });
    if (!t) throw new NotFoundException("Test topilmadi");
    const attempts = await this.prisma.weeklyAttempt.findMany({
      where: { weeklyTestId: testId, submittedAt: { not: null } },
      select: {
        id: true,
        userId: true,
        awayCount: true,
        awayMs: true,
        user: { select: PERSON_SELECT },
        answers: { orderBy: { order: "asc" }, include: ANSWER_INCLUDE },
      },
    });
    const same = sameWrongAnswers(
      attempts.flatMap((a) =>
        a.answers.map((x) => ({
          userId: a.userId,
          questionId: x.questionId,
          response: x.response,
          result: x.result,
        })),
      ),
    );
    const jumps = await this.jumps(attempts);
    const items = attempts.flatMap((a) =>
      a.answers.map((x) =>
        toItem(a, x, {
          group: same.get(x.questionId)?.find((g) => g.includes(a.userId)),
          jump: jumps.has(a.userId),
        }),
      ),
    );
    items.sort(
      (p, q) => rank(p) - rank(q) || p.student.name.localeCompare(q.student.name) || p.order - q.order,
    );
    return { testId: t.id, title: t.title, closesAt: t.closesAt.toISOString(), items };
  }

  /** Ustoz bali: urinish bali qayta hisoblanadi (o'quvchi oyna yopilgach ko'radi) */
  async grade(actorId: string, attemptId: string, questionId: string, input: GradeInput) {
    const a = await this.prisma.weeklyAttempt.findUnique({
      where: { id: attemptId },
      select: { submittedAt: true, weeklyTestId: true },
    });
    const x = await this.prisma.weeklyAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId } },
      select: { questionId: true },
    });
    if (!a || !x) throw new NotFoundException("Javob topilmadi");
    if (!a.submittedAt) throw new ConflictException("Test topshirilmagan: ball 0 (BR-W03)");
    await this.prisma.$transaction(async (tx) => {
      await tx.weeklyAnswer.update({
        where: { attemptId_questionId: { attemptId, questionId } },
        data: {
          teacherPoints: input.points,
          teacherNote: input.note || null,
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
      });
      const [answers, photoRows] = await Promise.all([
        tx.weeklyAnswer.findMany({
          where: { attemptId },
          select: { questionId: true, teacherPoints: true, result: true },
        }),
        // T-189: faqat shu urinish rasmlari (`_count` butun rasmlar jadvalini guruhlardi)
        tx.solutionPhoto.groupBy({ by: ["questionId"], where: { attemptId }, _count: { _all: true } }),
      ]);
      const photos = countMap(photoRows, "questionId");
      const score = answers.reduce(
        (sum, r) =>
          sum +
          answerPoints({
            teacherPoints: r.teacherPoints,
            result: r.result,
            photos: photos.get(r.questionId) ?? 0,
          }),
        0,
      );
      await tx.weeklyAttempt.update({ where: { id: attemptId }, data: { score } });
    });
    await this.audit.log({
      actorId,
      action: "weekly.grade",
      entity: "WeeklyAttempt",
      entityId: attemptId,
      data: { questionId, points: input.points },
    });
    return { ok: true };
  }

  /** Mavzu testlarida o'rtacha <50% bo'lib, shu haftalikda ≥90% olganlar */
  private async jumps(
    attempts: { userId: string; answers: { result: CheckResult | null; photos: unknown[] }[] }[],
  ) {
    // T-189: urinishlar bazada sanaladi (`_count` butun javoblar jadvalini guruhlardi)
    const topic = await topicAttemptChecks(
      this.prisma,
      attempts.map((a) => a.userId),
    );
    const out = new Set<string>();
    for (const a of attempts) {
      const mine = topic.get(a.userId) ?? [];
      const pts = a.answers.reduce(
        (s, x) => s + answerPoints({ teacherPoints: null, result: x.result, photos: x.photos.length }),
        0,
      );
      const weekly = percentOf(pts, a.answers.length) ?? 0;
      if (historyJump(averagePercent(mine), weekly)) out.add(a.userId);
    }
    return out;
  }
}
