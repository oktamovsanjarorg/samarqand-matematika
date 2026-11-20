import { Module } from "@nestjs/common";
import { AdminWeeklyController } from "./admin-weekly.controller";
import { AdminWeeklyService } from "./admin-weekly.service";
import { WeeklyScheduler } from "./weekly-scheduler";
import { WeeklyController } from "./weekly.controller";
import { WeeklyService } from "./weekly.service";

@Module({
  controllers: [WeeklyController, AdminWeeklyController],
  providers: [WeeklyService, AdminWeeklyService, WeeklyScheduler],
})
export class WeeklyModule {}
