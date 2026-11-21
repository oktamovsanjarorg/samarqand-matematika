import { Injectable } from "@nestjs/common";
import type { StudentOfflineResult } from "@samarqand/shared";
import { PrismaService } from "../prisma/prisma.service";

/** O'quvchi o'z offline natijalarini ko'radi (T-056c): faqat o'ziga biriktirilgan qatorlar */
@Injectable()
export class MyOfflineService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<StudentOfflineResult[]> {
    const mine = await this.prisma.offlineResult.findMany({
      where: { userId },
      orderBy: { offlineTest: { date: "desc" } },
      take: 50,
      select: {
        id: true,
        scores: true,
        total: true,
        offlineTestId: true,
        offlineTest: {
          select: { title: true, date: true, sections: true, _count: { select: { results: true } } },
        },
      },
    });
    return Promise.all(
      mine.map(async (r) => {
        const above = await this.prisma.offlineResult.count({
          where: { offlineTestId: r.offlineTestId, total: { gt: r.total } },
        });
        return {
          id: r.id,
          title: r.offlineTest.title,
          date: r.offlineTest.date.toISOString().slice(0, 10),
          sections: r.offlineTest.sections,
          scores: r.scores,
          total: r.total,
          place: above + 1,
          participants: r.offlineTest._count.results,
        };
      }),
    );
  }
}
