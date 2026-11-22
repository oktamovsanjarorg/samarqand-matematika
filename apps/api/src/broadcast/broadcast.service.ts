import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import type { BroadcastInput, BroadcastResult } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { esc, NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Ustozdan e'lon (T-116): qabul qilingan o'quvchilar va ularning tasdiqlangan ota-onalariga bot xabari.
 * Matn oddiy matn sifatida yuboriladi (HTML emas). Har yuborish jurnalga matni bilan yoziladi.
 */
@Injectable()
export class BroadcastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
    private readonly audit: AuditService,
  ) {}

  async send(actorId: string, input: BroadcastInput): Promise<BroadcastResult> {
    if (input.groupId && !(await this.prisma.group.count({ where: { id: input.groupId } })))
      throw new NotFoundException("Guruh topilmadi");
    const ids = await this.recipients(input);
    if (input.dryRun) return { recipients: ids.length, sent: 0 };

    const text = `📢 <b>Ustozdan eʼlon</b>\n\n${esc(input.text)}`;
    const results = await Promise.all(ids.map((id) => this.notify.toUser(id, text)));
    const sent = results.filter(Boolean).length;
    await this.audit.log({
      actorId,
      action: "broadcast.send",
      entity: "Broadcast",
      ...(input.groupId ? { entityId: input.groupId } : {}),
      data: {
        audience: input.audience,
        groupId: input.groupId,
        recipients: ids.length,
        sent,
        text: input.text,
      },
    });
    return { recipients: ids.length, sent };
  }

  /** Qabul qilingan, bloklanmagan o'quvchilar (guruh bo'yicha) va ularning tasdiqlangan ota-onalari */
  private async recipients(input: BroadcastInput): Promise<string[]> {
    const student: Prisma.StudentProfileWhereInput = {
      acceptedAt: { not: null },
      user: { isBlocked: false },
      ...(input.groupId ? { groupId: input.groupId } : {}),
    };
    const [students, parents] = await Promise.all([
      input.audience === "parents"
        ? []
        : this.prisma.user.findMany({ where: { role: "STUDENT", student }, select: { id: true } }),
      input.audience === "students"
        ? []
        : this.prisma.user.findMany({
            where: { role: "PARENT", isBlocked: false, children: { some: { status: "APPROVED", student } } },
            select: { id: true },
          }),
    ]);
    return [...students, ...parents].map((u) => u.id);
  }
}
