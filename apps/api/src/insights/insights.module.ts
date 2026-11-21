import { Module } from "@nestjs/common";
import { InsightsController } from "./insights.controller";
import { StudentInsightsService } from "./student-insights.service";

@Module({ controllers: [InsightsController], providers: [StudentInsightsService] })
export class InsightsModule {}
