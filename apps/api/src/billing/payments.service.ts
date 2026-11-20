import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { formatSum, type BillingView, type MyPayment } from "@samarqand/shared";
import { paymentSubmittedText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { PlansService } from "./plans.service";
import { ReceiptStore, sniffImage } from "./receipts";

export const MY_PAYMENT_SELECT = {
  id: true,
  amountUzs: true,
  status: true,
  reviewNote: true,
  createdAt: true,
  plan: { select: { name: true } },
} as const;

type Row = {
  id: string;
  amountUzs: number;
  status: MyPayment["status"];
  reviewNote: string | null;
  createdAt: Date;
  plan: { name: string };
};
export const toMyPayment = (p: Row): MyPayment => ({
  id: p.id,
  planName: p.plan.name,
  amountUzs: p.amountUzs,
  status: p.status,
  reviewNote: p.reviewNote,
  createdAt: p.createdAt.toISOString(),
});

/** O'quvchi: tariflar, karta, obuna holati, chek yuborish (BR-B01, BR-B02) */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
    private readonly receipts: ReceiptStore,
    private readonly notify: NotifyService,
  ) {}

  async view(userId: string): Promise<BillingView> {
    const [plans, card, sub, payments] = await Promise.all([
      this.plans.active(),
      this.plans.card(),
      this.prisma.subscription.findFirst({
        where: { userId, endsAt: { gt: new Date() } },
        orderBy: { endsAt: "desc" },
      }),
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: MY_PAYMENT_SELECT,
      }),
    ]);
    return {
      plans,
      card,
      subscription: sub ? { endsAt: sub.endsAt.toISOString() } : null,
      payments: payments.map(toMyPayment),
    };
  }

  async submit(userId: string, planId: string, note: string | undefined, body: unknown): Promise<MyPayment> {
    if (!Buffer.isBuffer(body) || body.length === 0) throw new BadRequestException("Chek rasmini yuboring");
    const image = sniffImage(body);
    if (!image) throw new BadRequestException("Faqat rasm (JPG, PNG, WEBP) qabul qilinadi");
    const plan = await this.prisma.plan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException("Tarif topilmadi");

    // Ikki marta bosilsa ikkita chek yaratilmasin: o'quvchi bo'yicha qulf (BR-B02)
    const p = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment:${userId}`}))`;
      if (await tx.payment.count({ where: { userId, status: "PENDING" } }))
        throw new ConflictException("Avvalgi chekingiz hali tekshirilmoqda");
      return tx.payment.create({
        data: { userId, planId, amountUzs: plan.priceUzs, payerNote: note || null },
        select: {
          ...MY_PAYMENT_SELECT,
          user: { select: { firstName: true, lastName: true, student: { select: { fullName: true } } } },
        },
      });
    });
    try {
      const receiptPath = await this.receipts.save(p.id, body, image.ext);
      await this.prisma.payment.update({ where: { id: p.id }, data: { receiptPath } });
    } catch (e) {
      await this.prisma.payment.delete({ where: { id: p.id } });
      throw e;
    }
    const student = p.user.student?.fullName ?? [p.user.firstName, p.user.lastName].filter(Boolean).join(" ");
    await this.notify.toStaff(
      paymentSubmittedText({ student, plan: plan.name, amount: formatSum(plan.priceUzs) }),
      this.notify.adminButton("Cheklarni koʻrish", "payments"),
    );
    return toMyPayment(p);
  }

  /** Noto'g'ri rasm yuborilgan bo'lsa, tekshirilguncha o'quvchi o'zi bekor qiladi */
  async cancel(userId: string, id: string): Promise<void> {
    const p = await this.prisma.payment.findFirst({ where: { id, userId }, select: { receiptPath: true } });
    if (!p) throw new NotFoundException("Toʻlov topilmadi");
    const { count } = await this.prisma.payment.deleteMany({ where: { id, status: "PENDING" } });
    if (!count) throw new ConflictException("Chek allaqachon tekshirilgan");
    await this.receipts.remove(p.receiptPath);
  }
}
