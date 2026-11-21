import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { payerNote } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { PaymentsService } from "./payments.service";

/** O'quvchining to'lov sahifasi. Chek: tanasi rasm (image/jpeg|png|webp), tarif va izoh query'da */
@Roles("STUDENT")
@Controller("billing")
export class BillingController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  view(@CurrentUser() u: JwtUser) {
    return this.payments.view(u.sub);
  }

  @Post("payments")
  submit(
    @CurrentUser() u: JwtUser,
    @Query("planId") planId: string | undefined,
    @Query("note") note: string | undefined,
    @Body() body: unknown,
  ) {
    return this.payments.submit(u.sub, { planId: planId ?? "", note: parseBody(payerNote, note), body });
  }

  @Delete("payments/:id")
  @HttpCode(204)
  cancel(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.payments.cancel(u.sub, id);
  }
}
