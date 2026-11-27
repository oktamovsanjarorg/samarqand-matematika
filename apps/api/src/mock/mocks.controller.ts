import { Body, Controller, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { awayBody, saveAnswerBody } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { MocksService } from "./mocks.service";

/** Mock: o'quvchi (va sinab ko'rish uchun xodim). Ota-onaga yopiq */
@Roles("STUDENT", "TEACHER", "ASSISTANT")
@Controller()
export class MocksController {
  constructor(private readonly mocks: MocksService) {}

  @Get("mocks")
  list(@CurrentUser() u: JwtUser) {
    return this.mocks.list(u.sub);
  }

  @Post("mocks/:id/attempts")
  start(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.mocks.start(u.sub, u.role, id);
  }

  @Get("mock-attempts/:id")
  get(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.mocks.get(u.sub, id);
  }

  @Put("mock-attempts/:id/answers/:questionId")
  @HttpCode(204)
  save(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Param("questionId") questionId: string,
    @Body() body: unknown,
  ) {
    return this.mocks.save(u.sub, id, questionId, parseBody(saveAnswerBody, body).response);
  }

  /** T-193: test paytida ilovadan chiqish (ustozga signal) */
  @Post("mock-attempts/:id/away")
  @HttpCode(204)
  away(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.mocks.away(u.sub, id, parseBody(awayBody, body).ms);
  }

  @Post("mock-attempts/:id/submit")
  @HttpCode(200)
  submit(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.mocks.submit(u.sub, id);
  }
}
