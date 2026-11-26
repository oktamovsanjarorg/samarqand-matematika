import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from "@nestjs/common";
import {
  offlineImportInput,
  offlineMatchBody,
  offlinePreviewInput,
  offlineSectionsBody,
} from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { OfflineRankingService } from "./offline-ranking.service";
import { OfflineService } from "./offline.service";

const DAYS = new Set([0, 30, 90, 365]);

/** Offline (qog'ozdagi) test natijalari: ustoz va yordamchi */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/offline-tests")
export class OfflineController {
  constructor(
    private readonly offline: OfflineService,
    private readonly rank: OfflineRankingService,
  ) {}

  @Get()
  list() {
    return this.offline.list();
  }

  @Get("ranking")
  ranking(@Query("days") days?: string) {
    const d = Number(days ?? 90);
    return this.rank.ranking(DAYS.has(d) ? d : 90);
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

  @Put(":id/sections")
  sections(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.offline.setSections(u.sub, id, parseBody(offlineSectionsBody, body).sections);
  }

  @Post(":id/notify")
  @HttpCode(200)
  notify(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.rank.sendNotices(u.sub, id);
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
