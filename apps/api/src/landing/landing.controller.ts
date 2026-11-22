import { Controller, Get } from "@nestjs/common";
import type { LandingInfo } from "@samarqand/shared";
import { Public } from "../auth/decorators";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

const published = { isPublished: true, topic: { course: { isPublished: true } } } as const;

/** Landing (T-166): tokensiz ochiq; o'quvchi yoki to'lov haqida hech narsa qaytarmaydi */
@Controller("public")
export class LandingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  @Public()
  @Get("landing")
  async landing(): Promise<LandingInfo> {
    const [botLink, topics, lessons, questions] = await Promise.all([
      this.notify.botLink(),
      this.prisma.topic.count({
        where: { course: { isPublished: true }, lessons: { some: { isPublished: true } } },
      }),
      this.prisma.lesson.count({ where: published }),
      this.prisma.question.count({ where: published }),
    ]);
    return { botLink, content: { topics, lessons, questions } };
  }
}
