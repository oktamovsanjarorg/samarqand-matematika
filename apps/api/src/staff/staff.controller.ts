import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { staffAdd } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { StaffService } from "./staff.service";

/** Yordamchilarni faqat ustoz boshqaradi (T-086) */
@Roles("TEACHER")
@Controller("admin/staff")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list() {
    return this.staff.list();
  }

  @Post()
  @HttpCode(200)
  add(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.staff.add(u.sub, parseBody(staffAdd, body).userId);
  }

  @Delete(":id")
  remove(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.staff.remove(u.sub, id);
  }
}
