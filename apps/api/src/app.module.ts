import { ProgressModule } from "./progress/progress.module";
import { LandingModule } from "./landing/landing.module";
import { StatsModule } from "./stats/stats.module";
import { AdvisorModule } from "./advisor/advisor.module";
import { AgentModule } from "./agent/agent.module";
import { DynamicModule, Global, Module } from "@nestjs/common";
import { AccessModule } from "./access/access.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { ENV, type Env } from "./config/env";
import { ContentModule } from "./content/content.module";
import { QuestionsModule } from "./questions/questions.module";
import { TopicTestsModule } from "./topic-tests/topic-tests.module";
import { BillingModule } from "./billing/billing.module";
import { BroadcastModule } from "./broadcast/broadcast.module";
import { WeeklyModule } from "./weekly/weekly.module";
import { TutorModule } from "./tutor/tutor.module";
import { MockModule } from "./mock/mock.module";
import { GroupsModule } from "./groups/groups.module";
import { OfflineModule } from "./offline/offline.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { InsightsModule } from "./insights/insights.module";
import { AiModule } from "./ai/ai.module";
import { StudentsModule } from "./students/students.module";
import { ParentsModule } from "./parents/parents.module";
import { NotifyModule } from "./notify/notify.module";
import { ClientErrorsController } from "./health/client-errors.controller";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { StaffModule } from "./staff/staff.module";
import { TrashModule } from "./trash/trash.module";
import { UsersModule } from "./users/users.module";

@Global()
@Module({})
class EnvModule {
  static forRoot(env: Env): DynamicModule {
    return { module: EnvModule, providers: [{ provide: ENV, useValue: env }], exports: [ENV] };
  }
}

@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        EnvModule.forRoot(env),
        PrismaModule,
        AuditModule,
        TrashModule,
        AccessModule,
        UsersModule,
        AuthModule,
        StaffModule,
        ContentModule,
        QuestionsModule,
        TopicTestsModule,
        BillingModule,
        BroadcastModule,
        WeeklyModule,
        TutorModule,
        MockModule,
        GroupsModule,
        OfflineModule,
        DashboardModule,
        InsightsModule,
        AiModule,
        AgentModule,
        AdvisorModule,
        StatsModule,
        LandingModule,
        ProgressModule,
        StudentsModule,
        ParentsModule,
        NotifyModule,
      ],
      controllers: [HealthController, ClientErrorsController],
    };
  }
}
