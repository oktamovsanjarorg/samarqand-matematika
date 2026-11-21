import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { payerNote } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { PaymentsService } from "./payments.service";

/**
 * Ota-ona farzandi uchun to'laydi (T-120, BR-B07): o'quvchining to'lov sahifasi bilan bir xil,
 * faqat tasdiqlangan farzand uchun. Obuna farzandga yoziladi, natija ikkalasiga boradi.
 */
@Roles("PARENT")
@Controller("me/children/:studentId/billing")
export class ParentBillingController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  async view(@CurrentUser() u: JwtUser, @Param("studentId") studentId: string) {
    return this.payments.view(await this.payments.childUserId(u.sub, studentId));
  }

  @Post("payments")
  async submit(
    @CurrentUser() u: JwtUser,
    @Param("studentId") studentId: string,
    @Query() q: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    const child = await this.payments.childUserId(u.sub, studentId);
    const note = parseBody(payerNote, q.note);
    const planId = typeof q.planId === "string" ? q.planId : "";
    return this.payments.submit(child, { planId, note, body, by: u.sub });
  }

  @Delete("payments/:id")
  @HttpCode(204)
  async cancel(@CurrentUser() u: JwtUser, @Param("studentId") studentId: string, @Param("id") id: string) {
    return this.payments.cancel(await this.payments.childUserId(u.sub, studentId), id, u.sub);
  }
}
