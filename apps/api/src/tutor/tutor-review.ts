import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ERROR_CODES, type SolutionVerdict } from "@samarqand/shared";
import type { PrismaService } from "../prisma/prisma.service";
import { questionContext } from "./tutor-context";

/** O'quvchining yopilgan haftalik testdagi javobi (REVIEW). Oyna ochiq bo'lsa yordam yo'q (BR-T01) */
export async function reviewAnswer(
  prisma: PrismaService,
  p: { userId: string; attemptId: string; questionId: string; now: Date },
) {
  const a = await prisma.weeklyAnswer.findFirst({
    where: { attemptId: p.attemptId, questionId: p.questionId, attempt: { userId: p.userId } },
    include: {
      question: true,
      photos: { orderBy: { createdAt: "asc" }, select: { path: true } },
      aiReview: { select: { status: true, verdict: true } },
      attempt: { select: { submittedAt: true, weeklyTest: { select: { closesAt: true } } } },
    },
  });
  if (!a) throw new NotFoundException("Savol topilmadi");
  if (p.now < a.attempt.weeklyTest.closesAt)
    throw new ForbiddenException({
      code: ERROR_CODES.AI_BLOCKED,
      message: "Test yopilgach birga koʻrib chiqamiz",
    });
  return a;
}

type ReviewAnswer = Awaited<ReturnType<typeof reviewAnswer>>;

/**
 * Xato tahlili konteksti: ustoz bali va izohi, AI tekshiruvining qadamlari.
 * Ko'chirish belgilari, shubha va ustozga mo'ljallangan AI izohi hech qachon qo'shilmaydi (BR-W05).
 */
export function reviewContext(a: ReviewAnswer): string {
  const v = a.aiReview?.status === "DONE" ? (a.aiReview.verdict as SolutionVerdict) : null;
  const steps = v?.steps.map(
    (s, i) => `${i + 1}) ${s.ok ? "to'g'ri" : "xato"}: ${s.text}${s.note ? ` (${s.note})` : ""}`,
  );
  const lines = [
    `Test topshirilgan: ${a.attempt.submittedAt ? "ha" : "yo'q (0 ball)"}`,
    `Yechim rasmlari: ${a.photos.length} ta${a.photos.length ? " (xabarga biriktirilgan)" : ""}`,
    a.teacherPoints !== null ? `Ustoz bali: ${a.teacherPoints}` : "",
    a.teacherNote ? `Ustoz izohi o'quvchiga: ${a.teacherNote}` : "",
    steps?.length ? `Avtomatik tekshiruv qadamlari:\n${steps.join("\n")}` : "",
  ];
  return questionContext(a.question, { response: a.response, lines: lines.filter(Boolean) });
}
