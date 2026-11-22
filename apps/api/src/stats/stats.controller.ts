import { Controller, Get, Query } from "@nestjs/common";
import { statsMonth } from "@samarqand/shared";
import { Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { currentMonth } from "./stats-calc";
import { StatsService } from "./stats.service";

/** Oy statistikasi (T-162): ustoz va yordamchi; pul ma'lumoti yo'q */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/stats")
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  get(@Query("month") month: unknown) {
    return this.stats.month(month === undefined ? currentMonth() : parseBody(statsMonth, month));
  }
}
