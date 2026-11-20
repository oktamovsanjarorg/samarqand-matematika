import { Inject, Injectable } from "@nestjs/common";
import { describeResponse, isSuspected, type SolutionVerdict } from "@samarqand/shared";
import { AI_PROVIDER, type AiProvider } from "../ai/ai-provider";
import { ENV, type Env } from "../config/env";
import { tashkentDayStart } from "../common/time";
import { photoInputs } from "../ai/photos";
import { PrismaService } from "../prisma/prisma.service";
import { toDetail, toView } from "../questions/codec";
import { MediaStore } from "../storage/media-store";

const MAX_TRIES = 3;
const BATCH = 5;
const STALE_MS = 10 * 60_000;

const asJson = (v: SolutionVerdict) => v as unknown as object;

/**
 * AI yechim tekshiruvi navbati (T-033): topshirilganda rasmli savollar navbatga tushadi,
 * rejalashtiruvchi har daqiqada bir nechtasini tekshiradi. Har yozuv bazada egallab olinadi,
 * xato bo'lsa 3 martagacha qayta urinadi. AI o'chiq bo'lsa navbat bo'lmaydi — ustoz o'zi ko'radi.
 */
@Injectable()
export class AiReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaStore,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async enqueue(attemptId: string, questionIds: string[]) {
    if (this.ai.name === "off" || questionIds.length === 0) return;
    await this.prisma.aiReview.createMany({
      data: questionIds.map((questionId) => ({ attemptId, questionId })),
      skipDuplicates: true,
    });
  }

  /** Bir tick: kunlik chegaragacha, eng eskisidan boshlab */
  async process(now: Date): Promise<number> {
    if (this.ai.name === "off") return 0;
    const used = await this.prisma.aiReview.count({
      where: { tries: { gt: 0 }, updatedAt: { gte: tashkentDayStart(now) } },
    });
    const take = Math.min(BATCH, this.env.AI_DAILY_LIMIT - used);
    if (take <= 0) return 0;
    const retry = { tries: { lt: MAX_TRIES } };
    const due = await this.prisma.aiReview.findMany({
      where: {
        OR: [
          { status: "PENDING" },
          { status: "FAILED", ...retry },
          { status: "RUNNING", ...retry, updatedAt: { lt: new Date(now.getTime() - STALE_MS) } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take,
    });
    let done = 0;
    for (const r of due) {
      const key = { attemptId: r.attemptId, questionId: r.questionId };
      const claimed = await this.prisma.aiReview.updateMany({
        where: { ...key, status: r.status, tries: r.tries },
        data: { status: "RUNNING", tries: { increment: 1 } },
      });
      if (claimed.count && (await this.run(key))) done++;
    }
    return done;
  }

  private async run(key: { attemptId: string; questionId: string }): Promise<boolean> {
    const a = await this.prisma.weeklyAnswer.findUnique({
      where: { attemptId_questionId: key },
      include: { question: true, photos: { orderBy: { createdAt: "asc" } } },
    });
    if (!a) return false;
    const photos = await photoInputs(
      this.media,
      a.photos.map((p) => p.path),
    );
    const detail = toDetail(a.question);
    const view = toView(a.question);
    const verdict = await this.ai.checkSolution({
      question: view.text,
      modelSolution: detail.solution ?? "",
      correctAnswer: "answer" in detail ? describeResponse(view, detail.answer) : null,
      studentAnswer: describeResponse(view, a.response),
      photos,
    });
    const where = { attemptId_questionId: key };
    if (!verdict) {
      await this.prisma.aiReview.update({ where, data: { status: "FAILED" } });
      return false;
    }
    await this.prisma.aiReview.update({
      where,
      data: {
        status: "DONE",
        verdict: asJson(verdict),
        suspected: isSuspected(verdict),
        provider: this.ai.name,
        doneAt: new Date(),
      },
    });
    return true;
  }
}
