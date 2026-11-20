import { Module } from "@nestjs/common";
import { MediaModule } from "../storage/media.module";
import { AdminReviewService } from "./admin-review.service";
import { AiReviewService } from "./ai-reviews";
import { RankingService } from "./ranking.service";
import { AdminWeeklyController } from "./admin-weekly.controller";
import { AdminWeeklyService } from "./admin-weekly.service";
import { WeeklyPhotosService } from "./weekly-photos.service";
import { WeeklyScheduler } from "./weekly-scheduler";
import { WeeklyController } from "./weekly.controller";
import { WeeklyService } from "./weekly.service";

@Module({
  imports: [MediaModule],
  controllers: [WeeklyController, AdminWeeklyController],
  providers: [
    AdminReviewService,
    AiReviewService,
    RankingService,
    WeeklyService,
    WeeklyPhotosService,
    AdminWeeklyService,
    WeeklyScheduler,
  ],
})
export class WeeklyModule {}
