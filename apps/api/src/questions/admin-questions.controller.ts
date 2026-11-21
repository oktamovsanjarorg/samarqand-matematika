import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { questionInput, questionSearch } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminQuestionsService } from "./admin-questions.service";

/** Savollar banki: ustoz va yordamchi */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin")
export class AdminQuestionsController {
  constructor(private readonly questions: AdminQuestionsService) {}

  @Get("topics/:id/questions")
  list(@Param("id") topicId: string) {
    return this.questions.list(topicId);
  }

  @Post("topics/:id/questions")
  create(@CurrentUser() u: JwtUser, @Param("id") topicId: string, @Body() body: unknown) {
    return this.questions.create(u.sub, topicId, parseBody(questionInput, body));
  }

  @Get("questions")
  search(@Query() query: unknown) {
    return this.questions.search(parseBody(questionSearch, query).q);
  }

  @Get("questions/:id")
  get(@Param("id") id: string) {
    return this.questions.get(id);
  }

  @Put("questions/:id")
  replace(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.questions.replace(u.sub, id, parseBody(questionInput, body));
  }

  @Delete("questions/:id")
  @HttpCode(204)
  remove(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.questions.remove(u.sub, id);
  }
}
