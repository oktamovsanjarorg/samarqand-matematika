import {
  BadRequestException,
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
import { AI_PROVIDER, type AiProvider } from "../ai/ai-provider";
import { tashkentDayStart } from "../common/time";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { mentionsOpenQuestion, questionContext } from "./tutor-context";

/** Modelga yuboriladigan oxirgi xabarlar soni (xarajat chegarasi) */
const HISTORY = 20;

const blocked = () =>
  new ForbiddenException({
    code: ERROR_CODES.AI_BLOCKED,
    message: "Bu savol ochiq haftalik testda. Test yopilgach birga koʻrib chiqamiz",
  });

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
  ) {}

  async start(userId: string, input: StartTutorInput, now: Date): Promise<TutorChatView> {
    if (input.mode === "REVIEW") throw new BadRequestException("Bu rejim hali ishlamaydi");
    const target =
      input.mode === "PRACTICE" ? { questionId: input.questionId, attemptId: input.attemptId } : {};
    if (input.mode === "PRACTICE") {
      await this.practiceAnswer(userId, target.attemptId ?? "", target.questionId ?? "");
      await this.guardWeekly(target.questionId ?? "", now);
    }
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
    const context = await this.context(chat, text, now);
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
    const reply = await this.ai.tutor({ mode: chat.mode, context, history, photos: [] });
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
    const open = await this.prisma.weeklyQuestion.count({
      where: { questionId, weeklyTest: { isPublished: true, opensAt: { lte: now }, closesAt: { gt: now } } },
    });
    if (open) throw blocked();
  }

  private async context(chat: TutorChat, text: string, now: Date): Promise<string> {
    if (chat.mode === "PRACTICE") {
      const a = await this.practiceAnswer(chat.userId, chat.attemptId ?? "", chat.questionId ?? "");
      await this.guardWeekly(a.questionId, now);
      const tried = a.attempt.submittedAt ? "bor (test topshirilgan)" : "yo'q";
      return questionContext(a.question, { response: a.response, lines: [`Urinish: ${tried}`] });
    }
    const open = await this.prisma.weeklyQuestion.findMany({
      where: { weeklyTest: { isPublished: true, opensAt: { lte: now }, closesAt: { gt: now } } },
      select: { question: { select: { text: true } } },
    });
    if (
      mentionsOpenQuestion(
        text,
        open.map((o) => o.question.text),
      )
    )
      throw blocked();
    return "Erkin savol. Aniq masala konteksti yo'q.";
  }
}
