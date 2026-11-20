import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import type { AdminParentLink, ParentFlag, ParentLinkStatus } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { parentApprovedToParent, parentApprovedToStudent, parentRejectedToParent } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";

const INCLUDE = {
  parent: { select: { id: true, firstName: true, lastName: true, username: true } },
  student: {
    select: { userId: true, fullName: true, user: { select: { firstName: true, lastName: true } } },
  },
} satisfies Prisma.ParentLinkInclude;
type Row = Prisma.ParentLinkGetPayload<{ include: typeof INCLUDE }>;

const join = (u: { firstName: string; lastName: string | null }) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ");
const toView = (l: Row): AdminParentLink => ({
  id: l.id,
  status: l.status,
  phone: l.phone,
  flags: l.flags as ParentFlag[],
  parentName: join(l.parent),
  parentUsername: l.parent.username,
  studentId: l.student.userId,
  studentName: l.student.fullName ?? join(l.student.user),
  createdAt: l.createdAt.toISOString(),
  reviewedAt: l.reviewedAt?.toISOString() ?? null,
  rejectReason: l.rejectReason,
});

/** Ustoz navbati: ota-ona so'rovlari. Ustoz raqamga qo'ng'iroq qilib tekshiradi */
@Injectable()
export class AdminParentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notify: NotifyService,
  ) {}

  async list(status?: ParentLinkStatus): Promise<AdminParentLink[]> {
    const rows = await this.prisma.parentLink.findMany({
      where: status ? { status } : {},
      include: INCLUDE,
      // Shubhali belgisi borlar birinchi ko'rinadi: ularni ehtiyotroq tekshirish kerak
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    });
    return rows.map(toView).sort((a, b) => b.flags.length - a.flags.length);
  }

  async approve(actorId: string, id: string): Promise<AdminParentLink> {
    return this.review(actorId, id, { status: "APPROVED", rejectReason: null });
  }

  async reject(actorId: string, id: string, reason: string): Promise<AdminParentLink> {
    return this.review(actorId, id, { status: "REJECTED", rejectReason: reason });
  }

  private async review(
    actorId: string,
    id: string,
    data: { status: "APPROVED" | "REJECTED"; rejectReason: string | null },
  ): Promise<AdminParentLink> {
    const link = await this.prisma.parentLink.findUnique({ where: { id }, select: { status: true } });
    if (!link) throw new NotFoundException("Soʻrov topilmadi");
    if (link.status !== "PENDING") throw new ConflictException("Bu soʻrov allaqachon koʻrib chiqilgan");
    const row = await this.prisma.parentLink.update({
      where: { id },
      data: { ...data, reviewedById: actorId, reviewedAt: new Date() },
      include: INCLUDE,
    });
    await this.audit.log({
      actorId,
      action: data.status === "APPROVED" ? "parent.approve" : "parent.reject",
      entity: "ParentLink",
      entityId: id,
    });
    const view = toView(row);
    if (data.status === "APPROVED") {
      await this.notify.toUser(row.parent.id, parentApprovedToParent(view.studentName));
      await this.notify.toUser(row.student.userId, parentApprovedToStudent(view.parentName));
    } else {
      await this.notify.toUser(row.parent.id, parentRejectedToParent(data.rejectReason ?? ""));
    }
    return view;
  }
}
