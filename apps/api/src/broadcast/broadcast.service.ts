import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import {
  BROADCAST_AUDIENCES,
  type BroadcastInput,
  type BroadcastLogRow,
  type BroadcastResult,
} from "@samarqand/shared";
import { z } from "zod";
import { AuditService } from "../audit/audit.service";
import { esc, NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

/** Jurnalga yozilgan e'lon ma'lumoti; buzilgan yozuv tarixda ko'rsatilmaydi */
const logData = z.object({
  audience: z.enum(BROADCAST_AUDIENCES),
  groupId: z.string().nullable(),
  recipients: z.number(),
  sent: z.number(),
  text: z.string(),
});

const HISTORY = 20;

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
    const button = input.appButton ? this.notify.appButton("📐 Ilovani ochish", "") : undefined;
    const results = await Promise.all(ids.map((id) => this.notify.toUser(id, text, button)));
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

  /** Oxirgi e'lonlar, yangisi birinchi (T-117) */
  async history(): Promise<BroadcastLogRow[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { action: "broadcast.send" },
      orderBy: { createdAt: "desc" },
      take: HISTORY,
      select: { id: true, createdAt: true, data: true },
    });
    const rows = logs.flatMap((l) => {
      const d = logData.safeParse(l.data);
      return d.success ? [{ id: l.id, at: l.createdAt, ...d.data }] : [];
    });
    const groupIds = [...new Set(rows.flatMap((r) => (r.groupId ? [r.groupId] : [])))];
    const groups = await this.prisma.group.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, name: true },
    });
    const name = new Map(groups.map((g) => [g.id, g.name]));
    return rows.map(({ groupId, at, ...r }) => ({
      ...r,
      at: at.toISOString(),
      groupName: groupId ? (name.get(groupId) ?? "oʻchirilgan guruh") : null,
    }));
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
