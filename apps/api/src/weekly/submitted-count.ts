import type { PrismaClient } from "@samarqand/db";
import { RANKED } from "../common/ranked";

/** Haftalik testni topshirgan o'quvchilar soni (xodimlarsiz, BR-W10) */
export const submittedCount = (prisma: Pick<PrismaClient, "weeklyAttempt">, weeklyTestId: string) =>
  prisma.weeklyAttempt.count({ where: { weeklyTestId, submittedAt: { not: null }, ...RANKED } });
