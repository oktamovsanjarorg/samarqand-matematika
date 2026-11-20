import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { TutorChat } from "@samarqand/db";
import { ERROR_CODES, type StartTutorInput, type TutorChatView } from "@samarqand/shared";
import { AI_PROVIDER, type AiProvider, type SolutionPhotoInput } from "../ai/ai-provider";
import { photoInputs } from "../ai/photos";
import { tashkentDayStart } from "../common/time";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { MediaStore } from "../storage/media-store";
import { mentionsOpenQuestion, questionContext } from "./tutor-context";
import { reviewAnswer, reviewContext } from "./tutor-review";

/** Modelga yuboriladigan oxirgi xabarlar soni (xarajat chegarasi) */
const HISTORY = 20;

const blocked = () =>
  new ForbiddenException({
    code: ERROR_CODES.AI_BLOCKED,
    message: "Bu savol ochiq testda. Test yopilgach birga koʻrib chiqamiz",
  });

/** Ochiq (nashr qilingan, oyna ichidagi) haftalik test yoki mock (BR-T01) */
const openWindow = (now: Date) => ({ isPublished: true, opensAt: { lte: now }, closesAt: { gt: now } });

/**
 * AI yordamchi (PLAN §7, BR-T01–T04). Kontekst va rejim qoidasi serverda tuziladi;
 * har xabar saqlanadi, ustoz ko'radi.
 */
@Injectable()
export class TutorService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    @Inject(ENV) private readonly env: Env,
    private readonly media: MediaStore,
  ) {}

  async start(userId: string, input: StartTutorInput, now: Date): Promise<TutorChatView> {
    const target = input.mode === "FREE" ? {} : { questionId: input.questionId, attemptId: input.attemptId };
    if (input.mode === "PRACTICE") {
      await this.practiceAnswer(userId, input.attemptId, input.questionId);
      await this.guardWeekly(input.questionId, now);
    }
    if (input.mode === "REVIEW") await reviewAnswer(this.prisma, { userId, ...input, now });
    const where = {
      userId,
      mode: input.mode,
      questionId: target.questionId ?? null,
      attemptId: target.attemptId ?? null,
    };
    const chat =
      (await this.prisma.tutorChat.findFirst({ where, orderBy: { createdAt: "desc" } })) ??
      (await this.prisma.tutorChat.create({ data: where }));
    return this.view(chat, now);
  }

  async get(userId: string, chatId: string, now: Date): Promise<TutorChatView> {
    return this.view(await this.own(userId, chatId), now);
  }

  async send(userId: string, chatId: string, text: string, now: Date): Promise<TutorChatView> {
    const chat = await this.own(userId, chatId);
    if ((await this.remaining(userId, now)) <= 0)
      throw new HttpException(
        { code: ERROR_CODES.AI_LIMIT, message: "Bugungi savollar tugadi. Ertaga davom etamiz" },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const { context, photos } = await this.context(chat, text, now);
    const past = await this.prisma.tutorMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: HISTORY, // juft son: kesilgan tarix ham USER bilan boshlanadi
      select: { role: true, text: true },
    });
    // Xabarlar juft saqlanadi (USER, ASSISTANT), tarix doim o'quvchi xabari bilan boshlanadi
    const history = [...past.reverse(), { role: "USER" as const, text }].map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      text: m.text,
    }));
    const reply = await this.ai.tutor({ mode: chat.mode, context, history, photos });
    if (!reply)
      throw new ServiceUnavailableException({
        code: ERROR_CODES.AI_UNAVAILABLE,
        message: "Yordamchi hozir javob bera olmadi. Birozdan keyin urinib koʻring",
      });
    await this.prisma.$transaction([
      this.prisma.tutorMessage.create({ data: { chatId, role: "USER", text, createdAt: now } }),
      this.prisma.tutorMessage.create({
        data: {
          chatId,
          role: "ASSISTANT",
          text: reply,
          provider: this.ai.name,
          createdAt: new Date(now.getTime() + 1),
        },
      }),
      this.prisma.tutorChat.update({ where: { id: chatId }, data: { updatedAt: now } }),
    ]);
    return this.view(chat, now);
  }

  /** Bugun qolgan xabarlar (BR-T03) */
  private async remaining(userId: string, now: Date) {
    const used = await this.prisma.tutorMessage.count({
      where: { role: "USER", createdAt: { gte: tashkentDayStart(now) }, chat: { userId } },
    });
    return Math.max(0, this.env.TUTOR_DAILY_LIMIT - used);
  }

  private async view(chat: TutorChat, now: Date): Promise<TutorChatView> {
    const messages = await this.prisma.tutorMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: "asc" },
    });
    return {
      id: chat.id,
      mode: chat.mode,
      remaining: await this.remaining(chat.userId, now),
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  private async own(userId: string, chatId: string) {
    const chat = await this.prisma.tutorChat.findFirst({ where: { id: chatId, userId } });
    if (!chat) throw new NotFoundException("Suhbat topilmadi");
    return chat;
  }

  /** O'quvchining o'z mavzu testidagi savol (shu bilan to'liq kirish ham tekshirilgan, BR-P04) */
  private async practiceAnswer(userId: string, attemptId: string, questionId: string) {
    const answer = await this.prisma.topicAnswer.findFirst({
      where: { attemptId, questionId, attempt: { userId } },
      include: { question: true, attempt: { select: { submittedAt: true } } },
    });
    if (!answer) throw new NotFoundException("Savol topilmadi");
    return answer;
  }

  /** BR-T01: savol ochiq haftalik testda bo'lsa yordam yo'q */
  private async guardWeekly(questionId: string, now: Date) {
    const [weekly, mock] = await Promise.all([
      this.prisma.weeklyQuestion.count({ where: { questionId, weeklyTest: openWindow(now) } }),
      this.prisma.mockQuestion.count({ where: { questionId, mockTest: openWindow(now) } }),
    ]);
    if (weekly || mock) throw blocked();
  }

  /** Mock yechilayotganda yordamchi butunlay o'chiq (PLAN §5.2) */
  private async guardMock(userId: string, now: Date) {
    const active = await this.prisma.mockAttempt.count({
      where: { userId, submittedAt: null, deadline: { gt: now } },
    });
    if (active)
      throw new ForbiddenException({
        code: ERROR_CODES.AI_BLOCKED,
        message: "Mock paytida yordamchi oʻchiq",
      });
  }

  /** Rejimga qarab kontekst va (xato tahlilida) o'quvchining yechim rasmlari */
  private async context(
    chat: TutorChat,
    text: string,
    now: Date,
  ): Promise<{ context: string; photos: SolutionPhotoInput[] }> {
    await this.guardMock(chat.userId, now);
    const ids = { userId: chat.userId, attemptId: chat.attemptId ?? "", questionId: chat.questionId ?? "" };
    if (chat.mode === "PRACTICE") {
      const a = await this.practiceAnswer(ids.userId, ids.attemptId, ids.questionId);
      await this.guardWeekly(a.questionId, now);
      const tried = a.attempt.submittedAt ? "bor (test topshirilgan)" : "yo'q";
      return {
        context: questionContext(a.question, { response: a.response, lines: [`Urinish: ${tried}`] }),
        photos: [],
      };
    }
    if (chat.mode === "REVIEW") {
      const a = await reviewAnswer(this.prisma, { ...ids, now });
      return {
        context: reviewContext(a),
        photos: await photoInputs(
          this.media,
          a.photos.map((p) => p.path),
        ),
      };
    }
    const [weekly, mock] = await Promise.all([
      this.prisma.weeklyQuestion.findMany({
        where: { weeklyTest: openWindow(now) },
        select: { question: { select: { text: true } } },
      }),
      this.prisma.mockQuestion.findMany({
        where: { mockTest: openWindow(now) },
        select: { question: { select: { text: true } } },
      }),
    ]);
    const open = [...weekly, ...mock].map((o) => o.question.text);
    if (mentionsOpenQuestion(text, open)) throw blocked();
    return { context: "Erkin savol. Aniq masala konteksti yo'q.", photos: [] };
  }
}
