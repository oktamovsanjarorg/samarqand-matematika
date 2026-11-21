import { Module } from "@nestjs/common";
import { AdminStudentsController } from "./admin-students.controller";
import { AdminStudentsService } from "./admin-students.service";
import { ProfileController } from "./profile.controller";
import { MySchoolService } from "./my-school.service";
import { ProfileService } from "./profile.service";
import { StudentCardService } from "./student-card.service";
import { AttentionService } from "../insights/attention.service";
import { StudentInsightsService } from "../insights/student-insights.service";
import { MyOfflineService } from "../offline/my-offline.service";
import { StatsService } from "../topic-tests/stats.service";

@Module({
  controllers: [ProfileController, AdminStudentsController],
  providers: [
    ProfileService,
    AdminStudentsService,
    MySchoolService,
    StudentCardService,
    // Holatsiz, faqat Prisma/Access'ga bog'liq: kartada qayta ishlatiladi
    AttentionService,
    StudentInsightsService,
    MyOfflineService,
    StatsService,
  ],
})
export class StudentsModule {}
