import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { saveAnswerBody } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { WeeklyPhotosService } from "./weekly-photos.service";
import { WeeklyService } from "./weekly.service";

/** Haftalik test: o'quvchi (va sinab ko'rish uchun xodim). Ota-onaga yopiq */
@Roles("STUDENT", "TEACHER", "ASSISTANT")
@Controller()
export class WeeklyController {
  constructor(
    private readonly weekly: WeeklyService,
    private readonly photos: WeeklyPhotosService,
  ) {}

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

  /** Yechim rasmi: tana rasm baytlari (image/jpeg, png, webp) */
  @Post("weekly-attempts/:id/answers/:questionId/photos")
  addPhoto(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Param("questionId") questionId: string,
    @Body() body: unknown,
  ) {
    return this.photos.add(u.sub, id, questionId, body);
  }

  @Delete("weekly-attempts/:id/photos/:photoId")
  @HttpCode(204)
  removePhoto(@CurrentUser() u: JwtUser, @Param("id") id: string, @Param("photoId") photoId: string) {
    return this.photos.remove(u.sub, id, photoId);
  }

  @Get("weekly-photos/:photoId")
  async photo(@CurrentUser() u: JwtUser, @Param("photoId") photoId: string, @Res() res: FastifyReply) {
    const r = await this.photos.readOwn(u.sub, photoId);
    return res.header("Content-Type", r.type).header("Cache-Control", "private, no-store").send(r.body);
  }
}
