import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { StudentInsightsService } from "../insights/student-insights.service";
import { MyOfflineService } from "../offline/my-offline.service";
import { MySchoolService } from "../students/my-school.service";
import { StatsService } from "../topic-tests/stats.service";
import { AdminParentsService } from "./admin-parents.service";
import { ChildSummaryService } from "./child-summary.service";
import { ParentLinkService } from "./parent-link.service";
import { ParentsController } from "./parents.controller";

@Module({
  imports: [UsersModule],
  controllers: [ParentsController],
  providers: [
    ParentLinkService,
    AdminParentsService,
    ChildSummaryService,
    // Holatsiz, faqat Prisma'ga bog'liq: ota-ona kabinetida qayta ishlatiladi
    StatsService,
    MySchoolService,
    MyOfflineService,
    StudentInsightsService,
  ],
})
export class ParentsModule {}
