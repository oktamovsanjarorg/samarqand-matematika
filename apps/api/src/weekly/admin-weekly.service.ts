import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  weeklyStatus,
  type AdminWeeklyDetail,
  type AdminWeeklyRow,
  type WeeklyStanding,
  type WeeklyTestInput,
} from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { scoreOf } from "./weekly-views";

const ROW_SELECT = {
  id: true,
  title: true,
  opensAt: true,
  closesAt: true,
  isPublished: true,
  _count: { select: { questions: true, attempts: { where: { submittedAt: { not: null } } } } },
} as const;
type Row = {
  id: string;
  title: string;
  opensAt: Date;
  closesAt: Date;
  isPublished: boolean;
  _count: { questions: number; attempts: number };
};

const toRow = (t: Row, now: Date): AdminWeeklyRow => ({
  id: t.id,
  title: t.title,
  opensAt: t.opensAt.toISOString(),
  closesAt: t.closesAt.toISOString(),
  isPublished: t.isPublished,
  status: weeklyStatus(now, t.opensAt, t.closesAt),
  questionCount: t._count.questions,
  submitted: t._count.attempts,
});

const fullName = (u: {
  firstName: string;
  lastName: string | null;
  student: { fullName: string | null } | null;
}) => u.student?.fullName ?? [u.firstName, u.lastName].filter(Boolean).join(" ");

/** Ustoz: haftalik testlar. Boshlangan testning savollari o'zgarmaydi (urinishlar bir xil savollarda bo'lsin) */
@Injectable()
export class AdminWeeklyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminWeeklyRow[]> {
    const rows = await this.prisma.weeklyTest.findMany({
      orderBy: { opensAt: "desc" },
      take: 100,
      select: ROW_SELECT,
    });
    const now = new Date();
    return rows.map((r) => toRow(r, now));
  }

  async get(id: string): Promise<AdminWeeklyDetail> {
    const t = await this.prisma.weeklyTest.findUnique({
      where: { id },
      select: {
        ...ROW_SELECT,
        questions: {
          orderBy: { order: "asc" },
          select: {
            question: { select: { id: true, type: true, text: true, topic: { select: { title: true } } } },
          },
        },
      },
    });
    if (!t) throw new NotFoundException("Test topilmadi");
    const questions = t.questions.map(({ question: q }) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      topicTitle: q.topic.title,
    }));
    return { ...toRow(t, new Date()), questionIds: questions.map((q) => q.id), questions };
  }

  async create(actorId: string, input: WeeklyTestInput) {
    await this.mustQuestions(input.questionIds);
    const t = await this.prisma.weeklyTest.create({
      data: {
        ...this.fields(input),
        questions: { create: input.questionIds.map((questionId, order) => ({ questionId, order })) },
      },
      select: { id: true },
    });
    await this.audit.log({
      actorId,
      action: "weekly.create",
      entity: "WeeklyTest",
      entityId: t.id,
      data: { title: input.title },
    });
    return t;
  }

  async update(actorId: string, id: string, input: WeeklyTestInput) {
    const current = await this.get(id);
    const sameQuestions = current.questionIds.join() === input.questionIds.join();
    const started = await this.prisma.weeklyAttempt.count({ where: { weeklyTestId: id } });
    if (started && !sameQuestions)
      throw new ConflictException("Test boshlangan: savollarni oʻzgartirib boʻlmaydi");
    await this.mustQuestions(input.questionIds);
    await this.prisma.$transaction(async (tx) => {
      await tx.weeklyTest.update({ where: { id }, data: this.fields(input) });
      if (sameQuestions) return;
      await tx.weeklyQuestion.deleteMany({ where: { weeklyTestId: id } });
      await tx.weeklyQuestion.createMany({
        data: input.questionIds.map((questionId, order) => ({ weeklyTestId: id, questionId, order })),
      });
    });
    await this.audit.log({
      actorId,
      action: "weekly.update",
      entity: "WeeklyTest",
      entityId: id,
      data: { title: input.title },
    });
    return { ok: true };
  }

  async remove(actorId: string, id: string) {
    if (await this.prisma.weeklyAttempt.count({ where: { weeklyTestId: id } }))
      throw new ConflictException("Testni ishlaganlar bor: oʻchirib boʻlmaydi, nashrdan oling");
    const { count } = await this.prisma.weeklyTest.deleteMany({ where: { id } });
    if (!count) throw new NotFoundException("Test topilmadi");
    await this.audit.log({ actorId, action: "weekly.delete", entity: "WeeklyTest", entityId: id });
  }

  /** Natijalar: ball kamayishi bo'yicha, teng bo'lsa erta topshirgan yuqorida. Ustoz oyna ochiq paytda ham ko'radi */
  async standings(id: string): Promise<WeeklyStanding[]> {
    const rows = await this.prisma.weeklyAttempt.findMany({
      where: { weeklyTestId: id },
      select: {
        userId: true,
        submittedAt: true,
        correct: true,
        score: true,
        user: { select: { firstName: true, lastName: true, student: { select: { fullName: true } } } },
      },
    });
    return rows
      .map((a) => ({
        userId: a.userId,
        name: fullName(a.user),
        submittedAt: a.submittedAt?.toISOString() ?? null,
        correct: a.correct ?? 0,
        score: scoreOf(a),
      }))
      .sort((x, y) => y.score - x.score || (x.submittedAt ?? "~").localeCompare(y.submittedAt ?? "~"));
  }

  private fields(i: WeeklyTestInput) {
    return {
      title: i.title,
      opensAt: new Date(i.opensAt),
      closesAt: new Date(i.closesAt),
      isPublished: i.isPublished ?? false,
    };
  }

  private async mustQuestions(ids: string[]) {
    const found = await this.prisma.question.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException("Baʼzi savollar topilmadi");
  }
}
