import { Module } from "@nestjs/common";
import { AttentionService } from "./attention.service";
import { InsightsController, AttentionController } from "./insights.controller";
import { StudentInsightsService } from "./student-insights.service";

@Module({
  controllers: [InsightsController, AttentionController],
  providers: [StudentInsightsService, AttentionService],
})
export class InsightsModule {}
