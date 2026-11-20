import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { adminStudentPatch } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminStudentsService } from "./admin-students.service";

@Roles("TEACHER", "ASSISTANT")
@Controller("admin/students")
export class AdminStudentsController {
  constructor(private readonly students: AdminStudentsService) {}

  @Get()
  list(@Query("filter") filter?: string, @Query("q") q?: string) {
    return this.students.list(filter === "new" ? "new" : "all", q?.slice(0, 100));
  }

  @Post(":id/accept")
  @HttpCode(200)
  accept(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.students.accept(u.sub, id);
  }

  @Patch(":id")
  update(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.students.update(u.sub, id, parseBody(adminStudentPatch, body));
  }
}
