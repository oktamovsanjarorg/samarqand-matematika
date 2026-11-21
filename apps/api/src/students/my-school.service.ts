import { Injectable } from "@nestjs/common";
import type { MySchool } from "@samarqand/shared";
import { PrismaService } from "../prisma/prisma.service";

const DAY = 24 * 3600_000;

/** O'quvchi profili: guruh, ota-ona holati va davomat (T-065) */
@Injectable()
export class MySchoolService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, now = new Date()): Promise<MySchool> {
    const p = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        group: { select: { name: true, schedule: true } },
        parents: { where: { status: { in: ["APPROVED", "PENDING"] } }, select: { status: true } },
      },
    });
    const attendance = await this.prisma.attendance.findMany({
      where: { userId, date: { gte: new Date(now.getTime() - 30 * DAY) } },
      orderBy: { date: "desc" },
      select: { date: true, status: true },
    });
    const parents = p?.parents ?? [];
    return {
      group: p?.group ?? null,
      parents: {
        approved: parents.filter((x) => x.status === "APPROVED").length,
        pending: parents.filter((x) => x.status === "PENDING").length,
      },
      attendance: attendance.map((a) => ({ date: a.date.toISOString().slice(0, 10), status: a.status })),
    };
  }
}
