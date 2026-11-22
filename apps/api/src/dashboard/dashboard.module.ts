import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DailyDigest } from "./daily-digest";
import { DashboardService } from "./dashboard.service";

@Module({ controllers: [DashboardController], providers: [DashboardService, DailyDigest] })
export class DashboardModule {}
