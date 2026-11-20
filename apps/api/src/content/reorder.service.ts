import { BadRequestException, Injectable } from "@nestjs/common";
import type { ReorderBody } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

const INVALID = "Roʻyxat toʻliq emas yoki boshqa boʻlimga tegishli: sahifani yangilab, qayta urinib koʻring";

/** Ota ichidagi tartibni almashtiradi: ids aynan shu otaning barcha bolalari bo'lishi shart */
@Injectable()
export class ReorderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async reorder(actorId: string, { kind, ids }: ReorderBody): Promise<void> {
    if (new Set(ids).size !== ids.length) throw new BadRequestException(INVALID);
    const siblings = await this.siblingIds(kind, ids[0] ?? "");
    const same = siblings.length === ids.length && ids.every((id) => siblings.includes(id));
    if (!same) throw new BadRequestException(INVALID);

    await this.prisma.$transaction(ids.map((id, order) => this.updateOrder(kind, id, order)));
    await this.audit.log({ actorId, action: `${kind}.reorder`, entity: kind, data: { ids } });
  }

  /** Birinchi elementning otasidagi barcha bolalar */
  private async siblingIds(kind: ReorderBody["kind"], firstId: string): Promise<string[]> {
    const pick = (rows: { id: string }[]) => rows.map((r) => r.id);
    if (kind === "course") return pick(await this.prisma.course.findMany({ select: { id: true } }));
    if (kind === "topic") {
      const first = await this.prisma.topic.findUnique({
        where: { id: firstId },
        select: { courseId: true },
      });
      if (!first) return [];
      return pick(
        await this.prisma.topic.findMany({ where: { courseId: first.courseId }, select: { id: true } }),
      );
    }
    const first = await this.prisma.lesson.findUnique({ where: { id: firstId }, select: { topicId: true } });
    if (!first) return [];
    return pick(
      await this.prisma.lesson.findMany({ where: { topicId: first.topicId }, select: { id: true } }),
    );
  }

  private updateOrder(kind: ReorderBody["kind"], id: string, order: number) {
    if (kind === "course") return this.prisma.course.update({ where: { id }, data: { order } });
    if (kind === "topic") return this.prisma.topic.update({ where: { id }, data: { order } });
    return this.prisma.lesson.update({ where: { id }, data: { order } });
  }
}
