import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { questionImportInput, questionInput, questionSearch } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminQuestionsService } from "./admin-questions.service";
import { QuestionImportService } from "./question-import.service";

/** Savollar banki: ustoz va yordamchi */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin")
export class AdminQuestionsController {
  constructor(
    private readonly questions: AdminQuestionsService,
    private readonly importer: QuestionImportService,
  ) {}

  @Get("topics/:id/questions")
  list(@Param("id") topicId: string) {
    return this.questions.list(topicId);
  }

  @Post("topics/:id/questions")
  create(@CurrentUser() u: JwtUser, @Param("id") topicId: string, @Body() body: unknown) {
    return this.questions.create(u.sub, topicId, parseBody(questionInput, body));
  }

  /** Excel (CSV) dan import (T-100): dryRun bilan oldindan ko'rish */
  @Post("topics/:id/questions/import")
  @HttpCode(200)
  import(@CurrentUser() u: JwtUser, @Param("id") topicId: string, @Body() body: unknown) {
    return this.importer.run(u.sub, topicId, parseBody(questionImportInput, body));
  }

  /** Mavzudagi barcha qoralamalarni nashr qilish (T-103) */
  @Post("topics/:id/questions/publish")
  @HttpCode(200)
  publishAll(@CurrentUser() u: JwtUser, @Param("id") topicId: string) {
    return this.questions.publishAll(u.sub, topicId);
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
