import { BadRequestException, Injectable } from "@nestjs/common";
import type { ReorderBody } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

const INVALID = "Roʻyxat toʻliq emas yoki boshqa boʻlimga tegishli: sahifani yangilab, qayta urinib koʻring";
type Kind = ReorderBody["kind"];
const pick = (rows: { id: string }[]) => rows.map((r) => r.id);
const ID = { id: true } as const;

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
  private async siblingIds(kind: Kind, firstId: string): Promise<string[]> {
    const db = this.prisma;
    if (kind === "course") return pick(await db.course.findMany({ select: ID }));
    if (kind === "topic") {
      const first = await db.topic.findUnique({ where: { id: firstId }, select: { courseId: true } });
      return first ? pick(await db.topic.findMany({ where: { courseId: first.courseId }, select: ID })) : [];
    }
    const where = { id: firstId };
    const parent =
      kind === "lesson"
        ? await db.lesson.findUnique({ where, select: { topicId: true } })
        : await db.question.findUnique({ where, select: { topicId: true } });
    if (!parent) return [];
    const byTopic = { where: { topicId: parent.topicId }, select: ID };
    return pick(kind === "lesson" ? await db.lesson.findMany(byTopic) : await db.question.findMany(byTopic));
  }

  private updateOrder(kind: Kind, id: string, order: number) {
    const args = { where: { id }, data: { order } };
    if (kind === "course") return this.prisma.course.update(args);
    if (kind === "topic") return this.prisma.topic.update(args);
    if (kind === "lesson") return this.prisma.lesson.update(args);
    return this.prisma.question.update(args);
  }
}
