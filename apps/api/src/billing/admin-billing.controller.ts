import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, Res } from "@nestjs/common";
import {
  cardInput,
  incomeMonth,
  PAYMENT_STATUSES,
  planInput,
  rejectPaymentBody,
  type PaymentStatus,
} from "@samarqand/shared";
import type { FastifyReply } from "fastify";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminPaymentsService } from "./admin-payments.service";
import { IncomeService } from "./income.service";
import { PlansService } from "./plans.service";

const asStatus = (s?: string): PaymentStatus =>
  PAYMENT_STATUSES.includes(s as PaymentStatus) ? (s as PaymentStatus) : "PENDING";

/** BR-B05: cheklarni ustoz va yordamchi tekshiradi; tarif va karta faqat ustozda */
@Controller("admin")
export class AdminBillingController {
  constructor(
    private readonly payments: AdminPaymentsService,
    private readonly plans: PlansService,
    private readonly income: IncomeService,
  ) {}

  @Get("payments")
  @Roles("TEACHER", "ASSISTANT")
  list(@Query("status") status?: string) {
    return this.payments.list(asStatus(status));
  }

  /** Oylik tushum faqat ustozga (BR-B05: pul va tarif ustozda) */
  @Get("income")
  @Roles("TEACHER")
  incomeOf(@Query("month") month: unknown) {
    return this.income.month(parseBody(incomeMonth, month));
  }

  @Get("payments/:id/receipt")
  @Roles("TEACHER", "ASSISTANT")
  async receipt(@Param("id") id: string, @Res() res: FastifyReply) {
    const r = await this.payments.receipt(id);
    return res.header("Content-Type", r.type).header("Cache-Control", "private, no-store").send(r.body);
  }

  @Post("payments/:id/approve")
  @HttpCode(200)
  @Roles("TEACHER", "ASSISTANT")
  approve(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.payments.approve(u.sub, id);
  }

  @Post("payments/:id/reject")
  @HttpCode(200)
  @Roles("TEACHER", "ASSISTANT")
  reject(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.payments.reject(u.sub, id, parseBody(rejectPaymentBody, body).reason);
  }

  @Get("plans")
  @Roles("TEACHER")
  plansList() {
    return this.plans.adminList();
  }

  @Post("plans")
  @Roles("TEACHER")
  createPlan(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.plans.create(u.sub, parseBody(planInput, body));
  }

  @Patch("plans/:id")
  @Roles("TEACHER")
  updatePlan(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.plans.update(u.sub, id, parseBody(planInput.partial(), body));
  }

  @Get("billing-card")
  @Roles("TEACHER")
  async card() {
    return { card: await this.plans.card() };
  }

  @Put("billing-card")
  @Roles("TEACHER")
  saveCard(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.plans.saveCard(u.sub, parseBody(cardInput, body));
  }
}
