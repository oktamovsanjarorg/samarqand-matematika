import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { weeklyTestInput } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminWeeklyService } from "./admin-weekly.service";
import { WeeklyPhotosService } from "./weekly-photos.service";

@Roles("TEACHER", "ASSISTANT")
@Controller("admin/weekly")
export class AdminWeeklyController {
  constructor(
    private readonly weekly: AdminWeeklyService,
    private readonly photos: WeeklyPhotosService,
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
}
