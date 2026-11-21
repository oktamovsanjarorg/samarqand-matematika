import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { LessonAnnounceResult } from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { AuditService } from "../audit/audit.service";
import { lessonNewText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Yangi dars haqida xabar (T-091, BR-C05): ustoz tugmani bosadi, bir marta yuboriladi.
 * Pullik dars: to'liq kirishli o'quvchilarga (BR-A04). Bepul dars: yopilmagan barcha o'quvchilarga (BR-C02).
 */
@Injectable()
export class LessonAnnounceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notify: NotifyService,
    private readonly audit: AuditService,
  ) {}

  async announce(actorId: string, id: string): Promise<LessonAnnounceResult> {
    const l = await this.prisma.lesson.findUnique({
      where: { id },
      select: {
        title: true,
        isFree: true,
        isPublished: true,
        topic: { select: { title: true, course: { select: { title: true, isPublished: true } } } },
      },
    });
    if (!l) throw new NotFoundException("Dars topilmadi");
    if (!l.isPublished || !l.topic.course.isPublished)
      throw new ConflictException("Avval darsni va kursni nashr qiling: oʻquvchilar uni koʻrishi kerak");
    const now = new Date();
    const claimed = await this.prisma.lesson.updateMany({
      where: { id, announcedAt: null },
      data: { announcedAt: now },
    });
    if (!claimed.count) throw new ConflictException("Bu dars haqida xabar allaqachon yuborilgan");

    const ids = l.isFree ? await this.openStudents() : await this.access.fullAccessStudentIds();
    const text = lessonNewText({
      title: l.title,
      course: l.topic.course.title,
      topic: l.topic.title,
      isFree: l.isFree,
    });
    const open = this.notify.appButton("Darsni ochish", `lessons/${id}`);
    await Promise.all(ids.map((u) => this.notify.toUser(u, text, open)));
    await this.audit.log({
      actorId,
      action: "lesson.announce",
      entity: "Lesson",
      entityId: id,
      data: { sent: ids.length },
    });
    return { sent: ids.length, announcedAt: now.toISOString() };
  }

  private async openStudents(): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { role: "STUDENT", isBlocked: false, NOT: { student: { accessMode: "CLOSED" } } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
