import { Injectable, NotFoundException } from "@nestjs/common";
import type { AdminLessonDetail, LessonInput } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

const DETAIL = {
  id: true,
  topicId: true,
  title: true,
  body: true,
  videoUrl: true,
  order: true,
  isFree: true,
  isPublished: true,
  updatedAt: true,
  announcedAt: true,
} as const;

type Row = Omit<AdminLessonDetail, "updatedAt" | "announcedAt"> & {
  updatedAt: Date;
  announcedAt: Date | null;
};
const toDetail = (l: Row): AdminLessonDetail => ({
  ...l,
  updatedAt: l.updatedAt.toISOString(),
  announcedAt: l.announcedAt?.toISOString() ?? null,
});

/** Admin: darslar */
@Injectable()
export class AdminLessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(id: string): Promise<AdminLessonDetail> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id }, select: DETAIL });
    if (!lesson) throw new NotFoundException("Dars topilmadi");
    return toDetail(lesson);
  }

  async create(actorId: string, topicId: string, input: LessonInput): Promise<AdminLessonDetail> {
    if (!(await this.prisma.topic.count({ where: { id: topicId } })))
      throw new NotFoundException("Mavzu topilmadi");
    const order = await this.prisma.lesson.count({ where: { topicId } });
    const lesson = await this.prisma.lesson.create({ data: { ...input, topicId, order }, select: DETAIL });
    await this.audit.log({ actorId, action: "lesson.create", entity: "Lesson", entityId: lesson.id });
    return toDetail(lesson);
  }

  async update(actorId: string, id: string, input: Partial<LessonInput>): Promise<AdminLessonDetail> {
    await this.get(id);
    const lesson = await this.prisma.lesson.update({ where: { id }, data: input, select: DETAIL });
    // Konspekt matni katta bo'lishi mumkin: auditga faqat o'zgargan maydon nomlari yoziladi
    await this.audit.log({
      actorId,
      action: "lesson.update",
      entity: "Lesson",
      entityId: id,
      data: { fields: Object.keys(input) },
    });
    return toDetail(lesson);
  }

  async remove(actorId: string, id: string): Promise<void> {
    await this.get(id);
    await this.prisma.lesson.delete({ where: { id } });
    await this.audit.log({ actorId, action: "lesson.delete", entity: "Lesson", entityId: id });
  }
}
