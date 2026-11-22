import type { PrismaClient } from "@samarqand/db";
import type { AdminDashboard } from "@samarqand/shared";
import { CARD_KEY } from "../billing/plans.service";

/**
 * Ishni boshlash (T-140): platforma ishga tushishi uchun kerakli qadamlar bajarilganmi.
 * Hammasi faktdan hisoblanadi: alohida "bajarildi" belgisi saqlanmaydi.
 */
export async function setupSteps(
  prisma: Pick<PrismaClient, "topic" | "lesson" | "question" | "plan" | "appSetting" | "studentProfile">,
): Promise<AdminDashboard["setup"]> {
  const [topics, lessons, questions, plans, card, students] = await Promise.all([
    prisma.topic.count(),
    prisma.lesson.count({ where: { isPublished: true } }),
    prisma.question.count({ where: { isPublished: true } }),
    prisma.plan.count({ where: { isActive: true } }),
    prisma.appSetting.count({ where: { key: CARD_KEY } }),
    prisma.studentProfile.count({ where: { acceptedAt: { not: null }, user: { role: "STUDENT" } } }),
  ]);
  return {
    course: topics > 0,
    lesson: lessons > 0,
    questions: questions > 0,
    billing: plans > 0 && card > 0,
    student: students > 0,
  };
}
