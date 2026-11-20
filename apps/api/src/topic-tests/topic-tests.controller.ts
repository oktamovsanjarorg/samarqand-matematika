import { Body, Controller, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { saveAnswerBody } from "@samarqand/shared";
import { CurrentUser, JwtUser } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { TopicTestsService } from "./topic-tests.service";

/** Mavzu testlari: kirgan har foydalanuvchi faqat o'z urinishlarini ko'radi */
@Controller()
export class TopicTestsController {
  constructor(private readonly tests: TopicTestsService) {}

  @Post("topics/:id/attempts")
  start(@CurrentUser() u: JwtUser, @Param("id") topicId: string) {
    return this.tests.start(u.sub, u.role, topicId);
  }

  @Get("attempts/:id")
  get(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.tests.get(u.sub, id);
  }

  @Put("attempts/:id/answers/:questionId")
  @HttpCode(204)
  save(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Param("questionId") questionId: string,
    @Body() body: unknown,
  ) {
    return this.tests.save(u.sub, id, questionId, parseBody(saveAnswerBody, body).response);
  }

  @Post("attempts/:id/submit")
  @HttpCode(200)
  submit(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.tests.submit(u.sub, id);
  }
}
