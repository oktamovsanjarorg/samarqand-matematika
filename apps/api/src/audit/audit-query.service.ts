import { Injectable } from "@nestjs/common";
import { AUDIT_SECTIONS, type AuditActor, type AuditPage, type AuditQuery } from "@samarqand/shared";
import { PERSON_SELECT, personName } from "../common/person";
import { PrismaService } from "../prisma/prisma.service";
import { auditTargets } from "./audit-targets";

const PAGE = 50;
const ACTOR = { select: { id: true, role: true, ...PERSON_SELECT } } as const;
const actorOf = (
  u: { id: string; role: AuditActor["role"] } & Parameters<typeof personName>[0],
): AuditActor => ({
  id: u.id,
  name: personName(u),
  role: u.role,
});

/** Jurnal (T-075): xodimlar amallari, yangisi birinchi, 50 tadan */
@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async page(q: AuditQuery): Promise<AuditPage> {
    const where = {
      ...(q.section ? { entity: { in: [...AUDIT_SECTIONS[q.section].entities] } } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
    };
    const found = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      select: { id: true, action: true, entity: true, entityId: true, createdAt: true, actor: ACTOR },
    });
    const rows = found.slice(0, PAGE);
    const [targets, actors] = await Promise.all([
      auditTargets(this.prisma, rows),
      this.prisma.user.findMany({
        where: { auditLogs: { some: {} } },
        ...ACTOR,
        orderBy: { firstName: "asc" },
      }),
    ]);
    return {
      rows: rows.map((r) => ({
        id: r.id,
        at: r.createdAt.toISOString(),
        actor: r.actor ? actorOf(r.actor) : null,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        target: (r.entityId && targets.get(`${r.entity}:${r.entityId}`)) ?? null,
      })),
      next: found.length > PAGE ? (rows.at(-1)?.id ?? null) : null,
      actors: actors.map(actorOf),
    };
  }
}
