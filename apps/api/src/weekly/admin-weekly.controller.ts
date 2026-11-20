import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { gradeInput, weeklyTestInput } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminReviewService } from "./admin-review.service";
import { AdminWeeklyService } from "./admin-weekly.service";
import { WeeklyPhotosService } from "./weekly-photos.service";

@Roles("TEACHER", "ASSISTANT")
@Controller("admin/weekly")
export class AdminWeeklyController {
  constructor(
    private readonly weekly: AdminWeeklyService,
    private readonly photos: WeeklyPhotosService,
    private readonly review: AdminReviewService,
  ) {}

  @Get()
  list() {
    return this.weekly.list();
  }

  @Post()
  create(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.weekly.create(u.sub, parseBody(weeklyTestInput, body));
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.weekly.get(id);
  }

  @Put(":id")
  update(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.weekly.update(u.sub, id, parseBody(weeklyTestInput, body));
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.weekly.remove(u.sub, id);
  }

  @Get(":id/standings")
  standings(@Param("id") id: string) {
    return this.weekly.standings(id);
  }

  @Get("photos/:photoId")
  async photo(@Param("photoId") photoId: string, @Res() res: FastifyReply) {
    const r = await this.photos.read(photoId);
    return res.header("Content-Type", r.type).header("Cache-Control", "private, no-store").send(r.body);
  }

  /** Ustoz navbati: shubhalilar birinchi (BR-W05) */
  @Get(":id/review")
  reviewQueue(@Param("id") id: string) {
    return this.review.queue(id);
  }

  /** Ustoz bali (BR-W06) */
  @Put("attempts/:attemptId/answers/:questionId/grade")
  grade(
    @CurrentUser() u: JwtUser,
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Body() body: unknown,
  ) {
    return this.review.grade(u.sub, attemptId, questionId, parseBody(gradeInput, body));
  }
}
