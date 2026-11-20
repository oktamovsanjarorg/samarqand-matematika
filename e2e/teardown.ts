import { PrismaClient } from "@samarqand/db";
import { E2E_PREFIX, E2E_TG_MAX, E2E_TG_MIN } from "./telegram";

/** Brauzer testlari yaratgan foydalanuvchilar (audit yozuvlari bilan) va "E2E " kurslarini o'chiradi */
export default async function teardown() {
  const prisma = new PrismaClient();
  try {
    const where = { telegramId: { gte: BigInt(E2E_TG_MIN), lt: BigInt(E2E_TG_MAX) } };
    const users = await prisma.user.findMany({ where, select: { id: true } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where });
    const inCourse = { topic: { course: { title: { startsWith: E2E_PREFIX } } } };
    await prisma.question.deleteMany({ where: inCourse });
    await prisma.lesson.deleteMany({ where: inCourse });
    await prisma.topic.deleteMany({ where: { course: { title: { startsWith: E2E_PREFIX } } } });
    await prisma.course.deleteMany({ where: { title: { startsWith: E2E_PREFIX } } });
  } finally {
    await prisma.$disconnect();
  }
}
