import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import { examTemplateInput, type ExamTemplate, type ExamTemplateInput } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

type Row = Prisma.ExamTemplateGetPayload<object>;

/** Bazadagi JSON shared sxema bilan qayta tekshiriladi: buzilgan qator ro'yxatga chiqmaydi */
export function toTemplate(r: Row): ExamTemplate | null {
  const parsed = examTemplateInput.safeParse({
    name: r.name,
    durationMin: r.durationMin,
    scaleMax: r.scaleMax,
    sections: r.sections,
    grades: r.grades,
  });
  return parsed.success ? { ...parsed.data, id: r.id, isActive: r.isActive } : null;
}

const toData = (t: ExamTemplateInput) => ({
  ...t,
  sections: t.sections as unknown as Prisma.InputJsonValue,
  grades: t.grades as unknown as Prisma.InputJsonValue,
});

/** Imtihon shablonlari (BR-M01): ustoz sozlaydi. O'tgan mocklar shablon nusxasini saqlaydi (T-051) */
@Injectable()
export class ExamTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<ExamTemplate[]> {
    const rows = await this.prisma.examTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(toTemplate).filter((t): t is ExamTemplate => t !== null);
  }

  async create(actorId: string, input: ExamTemplateInput) {
    const t = await this.prisma.examTemplate.create({ data: toData(input), select: { id: true } });
    await this.audit.log({
      actorId,
      action: "exam-template.create",
      entity: "ExamTemplate",
      entityId: t.id,
      data: input,
    });
    return t;
  }

  async update(actorId: string, id: string, input: ExamTemplateInput) {
    const { count } = await this.prisma.examTemplate.updateMany({ where: { id }, data: toData(input) });
    if (!count) throw new NotFoundException("Shablon topilmadi");
    await this.audit.log({
      actorId,
      action: "exam-template.update",
      entity: "ExamTemplate",
      entityId: id,
      data: input,
    });
    return { ok: true };
  }

  async setActive(actorId: string, id: string, isActive: boolean) {
    const { count } = await this.prisma.examTemplate.updateMany({ where: { id }, data: { isActive } });
    if (!count) throw new NotFoundException("Shablon topilmadi");
    await this.audit.log({
      actorId,
      action: "exam-template.active",
      entity: "ExamTemplate",
      entityId: id,
      data: { isActive },
    });
    return { ok: true };
  }
}
