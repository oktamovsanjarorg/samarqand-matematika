import { PrismaClient } from "@samarqand/db";
import { E2E_TG_MAX, E2E_TG_MIN } from "./telegram";

/** Brauzer testlari yaratgan foydalanuvchilarni (va ularning audit yozuvlarini) o'chiradi */
export default async function teardown() {
  const prisma = new PrismaClient();
  try {
    const where = { telegramId: { gte: BigInt(E2E_TG_MIN), lt: BigInt(E2E_TG_MAX) } };
    const users = await prisma.user.findMany({ where, select: { id: true } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where });
  } finally {
    await prisma.$disconnect();
  }
}
