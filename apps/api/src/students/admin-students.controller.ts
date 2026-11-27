import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  adminStudentPatch,
  STUDENT_FILTERS,
  studentAcceptBody,
  studentBlockBody,
  studentBulkInput,
  type StudentFilter,
} from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminStudentsService } from "./admin-students.service";
import { ManualStudentsService } from "./manual-students.service";
import { StudentCardService } from "./student-card.service";

@Roles("TEACHER", "ASSISTANT")
@Controller("admin/students")
export class AdminStudentsController {
  constructor(
    private readonly students: AdminStudentsService,
    private readonly card: StudentCardService,
    private readonly manual: ManualStudentsService,
  ) {}

  /** Qo'lda kiritish (T-186): har qatorda "Ism Familiya, telefon" */
  @Post("bulk")
  @HttpCode(200)
  bulk(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.manual.bulk(u.sub, parseBody(studentBulkInput, body));
  }

  @Get()
  list(@Query("filter") filter?: string, @Query("q") q?: string, @Query("group") group?: string) {
    const f = STUDENT_FILTERS.includes(filter as StudentFilter) ? (filter as StudentFilter) : "all";
    return this.students.list(f, q?.slice(0, 100), group?.slice(0, 40));
  }

  /** O'quvchi kartasi (T-068) */
  @Get(":id")
  one(@Param("id") id: string) {
    return this.card.get(id);
  }

  @Post(":id/accept")
  @HttpCode(200)
  accept(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.students.accept(u.sub, id, parseBody(studentAcceptBody, body ?? {}).groupId);
  }

  @Post(":id/block")
  @HttpCode(200)
  block(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    const b = parseBody(studentBlockBody, body);
    return this.students.block(u.sub, id, b.blocked, b.reason);
  }

  /** Begonani o'chirish: faqat ustoz va faqat qabul qilinmagan o'quvchi */
  @Roles("TEACHER")
  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.students.remove(u.sub, id);
  }

  @Patch(":id")
  update(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.students.update(u.sub, id, parseBody(adminStudentPatch, body));
  }
}
