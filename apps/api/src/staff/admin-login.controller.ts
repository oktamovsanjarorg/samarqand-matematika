import { BadRequestException, Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { adminLinkBody, telegramProfileSchema } from "@samarqand/shared";
import { Public } from "../auth/decorators";
import { AdminLoginService } from "./admin-login.service";
import { InternalGuard } from "./internal.guard";

@Controller()
export class AdminLoginController {
  constructor(private readonly login: AdminLoginService) {}

  /** Faqat bot chaqiradi: /admin buyrug'i */
  @Public()
  @UseGuards(InternalGuard)
  @Post("internal/admin-login-link")
  @HttpCode(200)
  async link(@Body() body: unknown) {
    const p = telegramProfileSchema.safeParse(body);
    if (!p.success) throw new BadRequestException("Telegram profili kerak");
    return { url: await this.login.createLink(p.data) };
  }

  /** Admin panel: havoladagi tokenni JWT'ga almashtirish */
  @Public()
  @Post("auth/admin-link")
  @HttpCode(200)
  consume(@Body() body: unknown) {
    const p = adminLinkBody.safeParse(body);
    if (!p.success) throw new BadRequestException("Token kerak");
    return this.login.consume(p.data.token);
  }
}
