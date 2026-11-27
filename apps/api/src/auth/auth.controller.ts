import { BadRequestException, Body, Controller, HttpCode, Post } from "@nestjs/common";
import { authTelegramBody, STAFF_ROLES, type AuthResponse } from "@samarqand/shared";
import { ProfileService } from "../students/profile.service";
import { AuthService } from "./auth.service";
import { Public } from "./decorators";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly profile: ProfileService,
  ) {}

  @Public()
  @Post("telegram")
  @HttpCode(200)
  async telegram(@Body() body: unknown): Promise<AuthResponse> {
    const parsed = authTelegramBody.safeParse(body);
    if (!parsed.success) throw new BadRequestException("initData kerak");
    const auth = await this.auth.loginWithTelegram(parsed.data.initData);
    // T-189: Mini App ochilishida ikkinchi so'rov (/me/profile) kutilmaydi. Xodim admin panelga o'tadi
    if (STAFF_ROLES.includes(auth.user.role)) return auth;
    return { ...auth, profile: await this.profile.my(auth.user.id, auth.user.role) };
  }
}
