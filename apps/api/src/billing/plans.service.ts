import { Injectable, NotFoundException } from "@nestjs/common";
import {
  cardInput,
  type AdminPlan,
  type BillingCard,
  type PlanInput,
  type PlanView,
} from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

const CARD_KEY = "billing.card";
const PLAN_SELECT = { id: true, name: true, priceUzs: true, durationDays: true, description: true } as const;

/** Tariflar va to'lov kartasi (ustoz sozlaydi). Karta raqami auditga to'liq yozilmaydi */
@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  active(): Promise<PlanView[]> {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: PLAN_SELECT,
    });
  }

  async adminList(): Promise<AdminPlan[]> {
    const rows = await this.prisma.plan.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        ...PLAN_SELECT,
        isActive: true,
        _count: { select: { subscriptions: { where: { endsAt: { gt: new Date() } } } } },
      },
    });
    return rows.map(({ _count, ...p }) => ({ ...p, activeCount: _count.subscriptions }));
  }

  async create(actorId: string, input: PlanInput) {
    const order = await this.prisma.plan.count();
    const plan = await this.prisma.plan.create({ data: { ...input, order }, select: { id: true } });
    await this.audit.log({ actorId, action: "plan.create", entity: "Plan", entityId: plan.id, data: input });
    return plan;
  }

  async update(actorId: string, id: string, input: Partial<PlanInput>) {
    const { count } = await this.prisma.plan.updateMany({ where: { id }, data: input });
    if (!count) throw new NotFoundException("Tarif topilmadi");
    await this.audit.log({ actorId, action: "plan.update", entity: "Plan", entityId: id, data: input });
    return { ok: true };
  }

  async card(): Promise<BillingCard | null> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: CARD_KEY } });
    const parsed = cardInput.safeParse(row?.value);
    return parsed.success ? parsed.data : null;
  }

  async saveCard(actorId: string, card: BillingCard): Promise<BillingCard> {
    await this.prisma.appSetting.upsert({
      where: { key: CARD_KEY },
      update: { value: card },
      create: { key: CARD_KEY, value: card },
    });
    await this.audit.log({
      actorId,
      action: "billing.card",
      entity: "AppSetting",
      entityId: CARD_KEY,
      data: { last4: card.number.slice(-4) },
    });
    return card;
  }
}
