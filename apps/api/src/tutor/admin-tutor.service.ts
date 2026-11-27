import { countMap } from "../common/count-map";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { AdminTutorChat, AdminTutorChatRow, TutorMode } from "@samarqand/shared";
import { personName, PERSON_SELECT } from "../common/person";
import { PrismaService } from "../prisma/prisma.service";

const CHAT_SELECT = {
  id: true,
  mode: true,
  userId: true,
  updatedAt: true,
  user: { select: PERSON_SELECT },
  question: { select: { text: true } },
} as const;

/** Ustoz: o'quvchilarning yordamchi bilan suhbatlari (BR-T04). Faqat o'qish */
@Injectable()
export class AdminTutorService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: { mode?: TutorMode; userId?: string }): Promise<AdminTutorChatRow[]> {
    const rows = await this.prisma.tutorChat.findMany({
      where: { mode: q.mode, userId: q.userId, messages: { some: {} } },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: CHAT_SELECT,
    });
    // T-189: faqat shu 100 ta suhbat xabarlari sanaladi (`_count` butun xabarlar jadvalini guruhlardi)
    const asked = countMap(
      await this.prisma.tutorMessage.groupBy({
        by: ["chatId"],
        where: { chatId: { in: rows.map((c) => c.id) }, role: "USER" },
        _count: { _all: true },
      }),
      "chatId",
    );
    return rows.map((c) => ({
      id: c.id,
      mode: c.mode,
      student: { userId: c.userId, name: personName(c.user) },
      question: c.question?.text ?? null,
      asked: asked.get(c.id) ?? 0,
      lastAt: c.updatedAt.toISOString(),
    }));
  }

  async get(id: string): Promise<AdminTutorChat> {
    const c = await this.prisma.tutorChat.findUnique({
      where: { id },
      select: {
        ...CHAT_SELECT,
        messages: { orderBy: { createdAt: "asc" }, include: { photo: { select: { id: true } } } },
      },
    });
    if (!c) throw new NotFoundException("Suhbat topilmadi");
    return {
      id: c.id,
      mode: c.mode,
      student: { userId: c.userId, name: personName(c.user) },
      question: c.question?.text ?? null,
      lastAt: c.updatedAt.toISOString(),
      messages: c.messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        photoId: m.photo?.id ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }
}
