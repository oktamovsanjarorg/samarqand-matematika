import { Body, Controller, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { saveAnswerBody } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { WeeklyService } from "./weekly.service";

/** Haftalik test: o'quvchi (va sinab ko'rish uchun xodim). Ota-onaga yopiq */
@Roles("STUDENT", "TEACHER", "ASSISTANT")
@Controller()
export class WeeklyController {
  constructor(private readonly weekly: WeeklyService) {}

  @Get("weekly")
  list(@CurrentUser() u: JwtUser) {
    return this.weekly.list(u.sub);
  }

  @Post("weekly/:id/attempts")
  start(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.weekly.start(u.sub, u.role, id);
  }

  @Get("weekly-attempts/:id")
  get(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.weekly.get(u.sub, id);
  }

  @Put("weekly-attempts/:id/answers/:questionId")
  @HttpCode(204)
  save(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Param("questionId") questionId: string,
    @Body() body: unknown,
  ) {
    return this.weekly.save(u.sub, id, questionId, parseBody(saveAnswerBody, body).response);
  }

  @Post("weekly-attempts/:id/submit")
  @HttpCode(200)
  submit(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.weekly.submit(u.sub, id);
  }
}
