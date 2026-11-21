import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import type { AdminPayment, PaymentStatus } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import {
  paymentApprovedParentText,
  paymentApprovedText,
  paymentRejectedParentText,
  paymentRejectedText,
} from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { MY_PAYMENT_SELECT, toMyPayment } from "./payments.service";
import { nextPeriod } from "./period";
import { MediaStore } from "../storage/media-store";

const SELECT = {
  ...MY_PAYMENT_SELECT,
  payerNote: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      phone: true,
      student: { select: { fullName: true } },
      subscriptions: { orderBy: { endsAt: "desc" }, take: 1, select: { endsAt: true } },
    },
  },
  submittedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.PaymentSelect;
type Row = Prisma.PaymentGetPayload<{ select: typeof SELECT }>;

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Tashkent",
});
const day = (d: Date) => DATE.format(d).replace(/\//g, ".");

function toAdmin(p: Row): AdminPayment {
  const u = p.user;
  const end = u.subscriptions[0]?.endsAt;
  return {
    ...toMyPayment(p),
    payerNote: p.payerNote,
    student: {
      id: u.id,
      name: u.student?.fullName ?? [u.firstName, u.lastName].filter(Boolean).join(" "),
      username: u.username,
      phone: u.phone,
    },
    activeUntil: end && end > new Date() ? end.toISOString() : null,
    submittedBy: p.submittedBy
      ? [p.submittedBy.firstName, p.submittedBy.lastName].filter(Boolean).join(" ")
      : null,
  };
}

/** Ustoz navbati: cheklar. Tasdiq obunani uzaytiradi (BR-B03), rad sabab bilan (BR-B04) */
@Injectable()
export class AdminPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receipts: MediaStore,
    private readonly audit: AuditService,
    private readonly notify: NotifyService,
  ) {}

  async list(status: PaymentStatus): Promise<AdminPayment[]> {
    const rows = await this.prisma.payment.findMany({
      where: { status },
      orderBy: status === "PENDING" ? { createdAt: "asc" } : { updatedAt: "desc" },
      take: 200,
      select: SELECT,
    });
    return rows.map(toAdmin);
  }

  async receipt(id: string) {
    const p = await this.prisma.payment.findUnique({ where: { id }, select: { receiptPath: true } });
    if (!p?.receiptPath) throw new NotFoundException("Chek topilmadi");
    return this.receipts.read(p.receiptPath);
  }

  async approve(actorId: string, id: string): Promise<AdminPayment> {
    const endsAt = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "APPROVED", reviewedById: actorId, reviewedAt: new Date() },
      });
      if (!count) throw new ConflictException("Chek allaqachon tekshirilgan yoki topilmadi");
      const p = await tx.payment.findUniqueOrThrow({
        where: { id },
        select: { userId: true, planId: true, plan: { select: { durationDays: true } } },
      });
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription:${p.userId}`}))`;
      const last = await tx.subscription.findFirst({
        where: { userId: p.userId },
        orderBy: { endsAt: "desc" },
        select: { endsAt: true },
      });
      const period = nextPeriod(new Date(), last?.endsAt ?? null, p.plan.durationDays);
      await tx.subscription.create({
        data: { userId: p.userId, planId: p.planId, paymentId: id, ...period },
      });
      return period.endsAt;
    });
    const view = await this.one(id);
    await this.audit.log({
      actorId,
      action: "payment.approve",
      entity: "Payment",
      entityId: id,
      data: { endsAt: endsAt.toISOString() },
    });
    await this.notify.toUser(
      view.student.id,
      paymentApprovedText(day(endsAt)),
      this.notify.appButton("Ilovani ochish", ""),
    );
    await this.toSubmitter(id, paymentApprovedParentText(view.student.name, day(endsAt)));
    return view;
  }

  async reject(actorId: string, id: string, reason: string): Promise<AdminPayment> {
    const { count } = await this.prisma.payment.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED", reviewedById: actorId, reviewedAt: new Date(), reviewNote: reason },
    });
    if (!count) throw new ConflictException("Chek allaqachon tekshirilgan yoki topilmadi");
    const view = await this.one(id);
    await this.audit.log({
      actorId,
      action: "payment.reject",
      entity: "Payment",
      entityId: id,
      data: { reason },
    });
    await this.notify.toUser(
      view.student.id,
      paymentRejectedText(reason),
      this.notify.appButton("Chekni qayta yuborish", "billing"),
    );
    await this.toSubmitter(id, paymentRejectedParentText(view.student.name, reason));
    return view;
  }

  /** Chekni ota-ona yuborgan bo'lsa, natija unga ham boradi (T-120) */
  private async toSubmitter(id: string, text: string): Promise<void> {
    const p = await this.prisma.payment.findUnique({ where: { id }, select: { submittedById: true } });
    if (p?.submittedById)
      await this.notify.toUser(p.submittedById, text, this.notify.appButton("Kabinetni ochish", ""));
  }

  private async one(id: string): Promise<AdminPayment> {
    return toAdmin(await this.prisma.payment.findUniqueOrThrow({ where: { id }, select: SELECT }));
  }
}
