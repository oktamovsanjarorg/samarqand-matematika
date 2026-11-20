import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { weeklyTestInput } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminWeeklyService } from "./admin-weekly.service";

@Roles("TEACHER", "ASSISTANT")
@Controller("admin/weekly")
export class AdminWeeklyController {
  constructor(private readonly weekly: AdminWeeklyService) {}

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
}
