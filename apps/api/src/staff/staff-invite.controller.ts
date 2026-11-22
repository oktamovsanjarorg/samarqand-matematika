import { BadRequestException, Body, Controller, Delete, HttpCode, Post, UseGuards } from "@nestjs/common";
import { staffInviteUse, telegramProfileSchema } from "@samarqand/shared";
import { CurrentUser, JwtUser, Public, Roles } from "../auth/decorators";
import { InternalGuard } from "./internal.guard";
import { StaffInviteService } from "./staff-invite.service";

@Controller()
export class StaffInviteController {
  constructor(private readonly invites: StaffInviteService) {}

  /** Ustoz yordamchi uchun taklif havolasi yaratadi (eskisi bekor bo'ladi) */
  @Roles("TEACHER")
  @Post("admin/staff/invite")
  @HttpCode(200)
  create(@CurrentUser() u: JwtUser) {
    return this.invites.create(u.sub);
  }

  @Roles("TEACHER")
  @Delete("admin/staff/invite")
  @HttpCode(204)
  async cancel(@CurrentUser() u: JwtUser) {
    await this.invites.cancel(u.sub);
  }

  /** Faqat bot chaqiradi: /start s_<kod> */
  @Public()
  @UseGuards(InternalGuard)
  @Post("internal/staff-invite")
  @HttpCode(200)
  async use(@Body() body: unknown) {
    const from = telegramProfileSchema.safeParse((body as { from?: unknown } | null)?.from);
    const code = staffInviteUse.safeParse(body);
    if (!from.success || !code.success) throw new BadRequestException("Profil va kod kerak");
    return { status: await this.invites.use(from.data, code.data.code) };
  }
}
