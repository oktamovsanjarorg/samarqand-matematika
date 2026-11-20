import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ERROR_CODES, type CourseView, type LessonView, type RoleName } from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { PrismaService } from "../prisma/prisma.service";

const published = { isPublished: true } as const;

/** O'quvchi: faqat nashr qilingan kurs va darslar (BR-C01), pullik dars to'liq kirishsiz yopiq (BR-C02) */
@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async courses(userId: string, role: RoleName): Promise<CourseView[]> {
    const full = await this.access.hasFullAccess(userId, role);
    const rows = await this.prisma.course.findMany({
      where: published,
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        topics: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            lessons: {
              where: published,
              orderBy: { order: "asc" },
              select: { id: true, title: true, isFree: true },
            },
            _count: { select: { questions: { where: published } } },
          },
        },
      },
    });
    return rows.map((c) => ({
      ...c,
      // Darsi ham, testi ham yo'q mavzu o'quvchiga ko'rsatilmaydi (BR-C01)
      topics: c.topics
        .filter((t) => t.lessons.length > 0 || t._count.questions > 0)
        .map(({ _count, ...t }) => ({
          ...t,
          questionCount: _count.questions,
          lessons: t.lessons.map((l) => ({ ...l, locked: !l.isFree && !full })),
        })),
    }));
  }

  async lesson(userId: string, role: RoleName, id: string): Promise<LessonView> {
    const l = await this.prisma.lesson.findFirst({
      where: { id, ...published, topic: { course: published } },
      select: {
        id: true,
        title: true,
        body: true,
        videoUrl: true,
        isFree: true,
        topic: { select: { title: true, course: { select: { title: true } } } },
      },
    });
    if (!l) throw new NotFoundException("Dars topilmadi");
    if (!l.isFree && !(await this.access.hasFullAccess(userId, role))) {
      throw new ForbiddenException({ code: ERROR_CODES.LOCKED, message: "Bu dars obuna bilan ochiladi" });
    }
    const { topic, ...rest } = l;
    return { ...rest, topicTitle: topic.title, courseTitle: topic.course.title };
  }
}
