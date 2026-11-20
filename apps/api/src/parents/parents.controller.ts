import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  PARENT_LINK_STATUSES,
  parentCodeBody,
  parentLinkBody,
  rejectParentBody,
  type ParentLinkStatus,
} from "@samarqand/shared";
import { CurrentUser, JwtUser, Public, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { InternalGuard } from "../staff/internal.guard";
import { AdminParentsService } from "./admin-parents.service";
import { ParentLinkService } from "./parent-link.service";

const asStatus = (s?: string) => PARENT_LINK_STATUSES.find((x) => x === s) as ParentLinkStatus | undefined;

@Controller()
export class ParentsController {
  constructor(
    private readonly links: ParentLinkService,
    private readonly admin: AdminParentsService,
  ) {}

  /** Bot: o'quvchi /ota buyrug'i */
  @Public()
  @UseGuards(InternalGuard)
  @Post("internal/parent-code")
  @HttpCode(200)
  code(@Body() body: unknown) {
    return this.links.codeFor(parseBody(parentCodeBody, body).from);
  }

  /** Bot: ota-ona havola orqali kirib, raqamini ulashdi */
  @Public()
  @UseGuards(InternalGuard)
  @Post("internal/parent-link")
  @HttpCode(200)
  link(@Body() body: unknown) {
    return this.links.link(parseBody(parentLinkBody, body));
  }

  @Roles("PARENT")
  @Get("me/children")
  children(@CurrentUser() u: JwtUser) {
    return this.links.children(u.sub);
  }

  @Roles("TEACHER", "ASSISTANT")
  @Get("admin/parent-links")
  list(@Query("status") status?: string) {
    return this.admin.list(asStatus(status));
  }

  @Roles("TEACHER", "ASSISTANT")
  @Post("admin/parent-links/:id/approve")
  @HttpCode(200)
  approve(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.admin.approve(u.sub, id);
  }

  @Roles("TEACHER", "ASSISTANT")
  @Post("admin/parent-links/:id/reject")
  @HttpCode(200)
  reject(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.admin.reject(u.sub, id, parseBody(rejectParentBody, body).reason);
  }
}
