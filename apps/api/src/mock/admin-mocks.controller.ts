import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { mockTestInput } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminMocksService } from "./admin-mocks.service";

/** Mocklar: haftalik test kabi ustoz va yordamchi tuzadi; shablonni faqat ustoz sozlaydi */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/mocks")
export class AdminMocksController {
  constructor(private readonly mocks: AdminMocksService) {}

  @Get()
  list() {
    return this.mocks.list();
  }

  @Post()
  create(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.mocks.create(u.sub, parseBody(mockTestInput, body));
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.mocks.get(id);
  }

  @Put(":id")
  update(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.mocks.update(u.sub, id, parseBody(mockTestInput, body));
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    await this.mocks.remove(u.sub, id);
  }
}
