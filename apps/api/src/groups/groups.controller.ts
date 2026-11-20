import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { attendanceBody, groupInput, groupMembersBody, groupPatch, isoDate } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AttendanceService } from "./attendance.service";
import { GroupsService } from "./groups.service";

/** Offline guruhlar: ustoz va yordamchi */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/groups")
export class GroupsController {
  constructor(
    private readonly groups: GroupsService,
    private readonly attendance: AttendanceService,
  ) {}

  @Get()
  list() {
    return this.groups.list();
  }

  @Post()
  create(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.groups.create(u.sub, parseBody(groupInput, body));
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.groups.get(id);
  }

  @Patch(":id")
  update(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.groups.update(u.sub, id, parseBody(groupPatch, body));
  }

  @Post(":id/students")
  add(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.groups.add(u.sub, id, parseBody(groupMembersBody, body).userIds);
  }

  @Delete(":id/students/:userId")
  remove(@CurrentUser() u: JwtUser, @Param("id") id: string, @Param("userId") userId: string) {
    return this.groups.remove(u.sub, id, userId);
  }

  @Get(":id/attendance")
  sheet(@Param("id") id: string, @Query("date") date: unknown) {
    return this.attendance.sheet(id, parseBody(isoDate, date));
  }

  @Put(":id/attendance")
  mark(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.attendance.mark(u.sub, id, parseBody(attendanceBody, body));
  }
}
