import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ERROR_CODES, type AdminCourseTree, type CourseInput, type TopicInput } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

const notEmpty = (what: string) =>
  new ConflictException({
    code: ERROR_CODES.NOT_EMPTY,
    message: `${what} boʻsh emas: avval ichidagilarni oʻchiring`,
  });

/** Admin: kurslar va mavzular */
@Injectable()
export class AdminCoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Butun daraxt: kurslar → mavzular → darslar (matnsiz) */
  async tree(): Promise<AdminCourseTree[]> {
    return this.prisma.course.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        order: true,
        isPublished: true,
        topics: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            lessons: {
              orderBy: { order: "asc" },
              select: { id: true, title: true, order: true, isFree: true, isPublished: true },
            },
          },
        },
      },
    });
  }

  async createCourse(actorId: string, input: CourseInput) {
    const order = await this.prisma.course.count();
    const course = await this.prisma.course.create({ data: { ...input, order } });
    await this.audit.log({ actorId, action: "course.create", entity: "Course", entityId: course.id });
    return course;
  }

  async updateCourse(actorId: string, id: string, input: Partial<CourseInput>) {
    await this.mustCourse(id);
    const course = await this.prisma.course.update({ where: { id }, data: input });
    await this.audit.log({ actorId, action: "course.update", entity: "Course", entityId: id, data: input });
    return course;
  }

  async deleteCourse(actorId: string, id: string) {
    await this.mustCourse(id);
    if (await this.prisma.topic.count({ where: { courseId: id } })) throw notEmpty("Kurs");
    await this.prisma.course.delete({ where: { id } });
    await this.audit.log({ actorId, action: "course.delete", entity: "Course", entityId: id });
  }

  async createTopic(actorId: string, courseId: string, input: TopicInput) {
    await this.mustCourse(courseId);
    const order = await this.prisma.topic.count({ where: { courseId } });
    const topic = await this.prisma.topic.create({ data: { ...input, courseId, order } });
    await this.audit.log({ actorId, action: "topic.create", entity: "Topic", entityId: topic.id });
    return topic;
  }

  async updateTopic(actorId: string, id: string, input: TopicInput) {
    await this.mustTopic(id);
    const topic = await this.prisma.topic.update({ where: { id }, data: input });
    await this.audit.log({ actorId, action: "topic.update", entity: "Topic", entityId: id, data: input });
    return topic;
  }

  async deleteTopic(actorId: string, id: string) {
    await this.mustTopic(id);
    if (await this.prisma.lesson.count({ where: { topicId: id } })) throw notEmpty("Mavzu");
    await this.prisma.topic.delete({ where: { id } });
    await this.audit.log({ actorId, action: "topic.delete", entity: "Topic", entityId: id });
  }

  private async mustCourse(id: string) {
    if (!(await this.prisma.course.count({ where: { id } }))) throw new NotFoundException("Kurs topilmadi");
  }

  private async mustTopic(id: string) {
    if (!(await this.prisma.topic.count({ where: { id } }))) throw new NotFoundException("Mavzu topilmadi");
  }
}
