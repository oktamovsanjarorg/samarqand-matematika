import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { fullNameBody, userPhoneBody } from "@samarqand/shared";
import { CurrentUser, JwtUser, Public, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { InternalGuard } from "../staff/internal.guard";
import { MySchoolService } from "./my-school.service";
import { ProfileService } from "./profile.service";

@Controller()
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly school: MySchoolService,
  ) {}

  /** Guruh, ota-ona holati, davomat (T-065) */
  @Get("me/school")
  @Roles("STUDENT")
  mySchool(@CurrentUser() u: JwtUser) {
    return this.school.get(u.sub);
  }

  @Get("me/profile")
  my(@CurrentUser() u: JwtUser) {
    return this.profile.my(u.sub, u.role);
  }

  @Post("me/name")
  @HttpCode(200)
  setName(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.profile.setName(u.sub, u.role, parseBody(fullNameBody, body).fullName);
  }

  /** Faqat bot chaqiradi: foydalanuvchi raqamini ulashdi */
  @Public()
  @UseGuards(InternalGuard)
  @Post("internal/user-phone")
  @HttpCode(200)
  phone(@Body() body: unknown) {
    return this.profile.savePhone(parseBody(userPhoneBody, body));
  }
}
