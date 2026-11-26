import { Injectable } from "@nestjs/common";
import { MILLIY_PRESET, type ExamGrade } from "@samarqand/shared";
import { toTemplate } from "../mock/exam-templates.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Offline test shkalasi va darajalari: eng eski faol imtihon shabloni (BR-M01).
 * Shablon yo'q bo'lsa Milliy sertifikat taklifi (Q-09).
 */
@Injectable()
export class OfflineTemplate {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<{ scaleMax: number; grades: ExamGrade[] }> {
    const rows = await this.prisma.examTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    const t = rows.map(toTemplate).find((x) => x !== null) ?? MILLIY_PRESET;
    return { scaleMax: t.scaleMax, grades: t.grades };
  }
}
