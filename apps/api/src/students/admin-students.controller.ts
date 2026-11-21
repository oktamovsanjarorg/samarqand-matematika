import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { adminStudentPatch, STUDENT_FILTERS, type StudentFilter } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminStudentsService } from "./admin-students.service";
import { StudentCardService } from "./student-card.service";

@Roles("TEACHER", "ASSISTANT")
@Controller("admin/students")
export class AdminStudentsController {
  constructor(
    private readonly students: AdminStudentsService,
    private readonly card: StudentCardService,
  ) {}

  @Get()
  list(@Query("filter") filter?: string, @Query("q") q?: string) {
    const f = STUDENT_FILTERS.includes(filter as StudentFilter) ? (filter as StudentFilter) : "all";
    return this.students.list(f, q?.slice(0, 100));
  }

  /** O'quvchi kartasi (T-068) */
  @Get(":id")
  one(@Param("id") id: string) {
    return this.card.get(id);
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
