import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { groupInput, groupMembersBody, groupPatch } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { GroupsService } from "./groups.service";

/** Offline guruhlar: ustoz va yordamchi */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/groups")
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

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
}
