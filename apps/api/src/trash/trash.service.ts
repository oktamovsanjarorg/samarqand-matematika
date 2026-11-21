import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@samarqand/db";
import { TRASH_DAYS, TRASH_LABELS, type TrashEntity, type TrashRow } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PERSON_SELECT, personName } from "../common/person";
import { PrismaService } from "../prisma/prisma.service";

const DAY = 86_400_000;
const LIST_LIMIT = 200;
const str = (v: unknown) => (typeof v === "string" ? v : null);

/** O'chirilayotgan qator: kurs, mavzu, dars yoki savol */
export type ContentRow = { id: string } & Record<string, unknown>;

/**
 * Axlat qutisi (T-099, FR-U05). O'chirishda qatorning to'liq nusxasi yoziladi, TRASH_DAYS kun ichida tiklanadi.
 * Faqat bo'sh yoki ishlatilmagan kontent o'chiriladi (BR-C03, BR-P05), shuning uchun bitta qatorni tiklash yetarli.
 */
@Injectable()
export class TrashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** O'chirish bilan bitta tranzaksiyada bajariladigan yozuv */
  record(actorId: string, entity: TrashEntity, row: ContentRow) {
    return this.prisma.trashItem.create({
      data: {
        entity,
        entityId: row.id,
        title: (str(row.title) ?? str(row.text) ?? "").slice(0, 160),
        parentId: str(row.courseId) ?? str(row.topicId),
        data: JSON.parse(JSON.stringify(row)) as Prisma.InputJsonObject,
        deletedById: actorId,
      },
    });
  }

  async list(now: Date): Promise<TrashRow[]> {
    await this.prisma.trashItem.deleteMany({
      where: { deletedAt: { lt: new Date(now.getTime() - TRASH_DAYS * DAY) } },
    });
    const rows = await this.prisma.trashItem.findMany({
      orderBy: { deletedAt: "desc" },
      take: LIST_LIMIT,
      select: {
        id: true,
        entity: true,
        title: true,
        parentId: true,
        deletedAt: true,
        deletedBy: { select: PERSON_SELECT },
      },
    });
    const places = await this.places(rows.flatMap((r) => (r.parentId ? [r.parentId] : [])));
    return rows.map((r) => ({
      id: r.id,
      entity: r.entity as TrashEntity,
      title: r.title,
      place: r.parentId ? (places.get(r.parentId) ?? null) : null,
      deletedAt: r.deletedAt.toISOString(),
      deletedBy: r.deletedBy ? personName(r.deletedBy) : null,
      expiresAt: new Date(r.deletedAt.getTime() + TRASH_DAYS * DAY).toISOString(),
    }));
  }

  async restore(actorId: string, id: string): Promise<{ entity: TrashEntity; entityId: string }> {
    const item = await this.prisma.trashItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Axlat qutisida topilmadi");
    const entity = item.entity as TrashEntity;
    await this.mustParent(entity, item.parentId);
    const data = { ...(item.data as Prisma.JsonObject), order: await this.nextOrder(entity, item.parentId) };
    await this.prisma.$transaction([
      this.create(entity, data),
      this.prisma.trashItem.delete({ where: { id } }),
    ]);
    await this.audit.log({ actorId, action: "trash.restore", entity, entityId: item.entityId });
    return { entity, entityId: item.entityId };
  }

  /** Ota yozuv joyida bo'lishi kerak: aks holda avval otani tiklash so'raladi */
  private async mustParent(entity: TrashEntity, parentId: string | null) {
    if (!parentId) return;
    const where = { where: { id: parentId } };
    const exists =
      entity === "Topic" ? await this.prisma.course.count(where) : await this.prisma.topic.count(where);
    if (exists) return;
    const parent = await this.prisma.trashItem.findFirst({
      where: { entityId: parentId },
      select: { entity: true, title: true },
    });
    throw new ConflictException(
      parent
        ? `Avval ${TRASH_LABELS[parent.entity as TrashEntity].toLowerCase()}ni tiklang: «${parent.title}»`
        : "Joylashgan boʻlimi butunlay oʻchgan: tiklab boʻlmaydi",
    );
  }

  /** Tiklangan qator ro'yxat oxiriga qo'yiladi: tartib raqamlari to'qnashmaydi */
  private nextOrder(entity: TrashEntity, parentId: string | null): Promise<number> {
    const p = parentId ?? "";
    if (entity === "Course") return this.prisma.course.count();
    if (entity === "Topic") return this.prisma.topic.count({ where: { courseId: p } });
    if (entity === "Lesson") return this.prisma.lesson.count({ where: { topicId: p } });
    return this.prisma.question.count({ where: { topicId: p } });
  }

  private create(entity: TrashEntity, data: Prisma.JsonObject) {
    const d = data as unknown;
    if (entity === "Course")
      return this.prisma.course.create({ data: d as Prisma.CourseUncheckedCreateInput });
    if (entity === "Topic") return this.prisma.topic.create({ data: d as Prisma.TopicUncheckedCreateInput });
    if (entity === "Lesson")
      return this.prisma.lesson.create({ data: d as Prisma.LessonUncheckedCreateInput });
    // Yozma savolda javob yo'q (null): Json ustuniga null DbNull bilan yoziladi
    const q = d as Prisma.QuestionUncheckedCreateInput;
    return this.prisma.question.create({ data: { ...q, answer: q.answer ?? Prisma.DbNull } });
  }

  /** Ota id → "Kurs" yoki "Kurs · Mavzu" */
  private async places(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    const [courses, topics] = await Promise.all([
      this.prisma.course.findMany({ where: { id: { in: unique } }, select: { id: true, title: true } }),
      this.prisma.topic.findMany({
        where: { id: { in: unique } },
        select: { id: true, title: true, course: { select: { title: true } } },
      }),
    ]);
    return new Map([
      ...courses.map((c) => [c.id, c.title] as const),
      ...topics.map((t) => [t.id, `${t.course.title} · ${t.title}`] as const),
    ]);
  }
}
