import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { offlineImportInput, offlineMatchBody, offlinePreviewInput } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { OfflineService } from "./offline.service";

/** Tashqi (offline) test natijalari: ustoz va yordamchi */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/offline-tests")
export class OfflineController {
  constructor(private readonly offline: OfflineService) {}

  @Get()
  list() {
    return this.offline.list();
  }

  @Post("preview")
  @HttpCode(200)
  preview(@Body() body: unknown) {
    const b = parseBody(offlinePreviewInput, body);
    return this.offline.preview(b.csv, b.groupId);
  }

  @Post()
  create(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.offline.create(u.sub, parseBody(offlineImportInput, body));
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.offline.get(id);
  }

  @Patch(":id/results/:resultId")
  match(
    @CurrentUser() u: JwtUser,
    @Param("id") id: string,
    @Param("resultId") resultId: string,
    @Body() body: unknown,
  ) {
    return this.offline.match(u.sub, id, resultId, parseBody(offlineMatchBody, body).userId);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.offline.remove(u.sub, id);
  }
}
