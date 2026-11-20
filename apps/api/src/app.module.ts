import { DynamicModule, Global, Module } from "@nestjs/common";
import { AccessModule } from "./access/access.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { ENV, type Env } from "./config/env";
import { ContentModule } from "./content/content.module";
import { QuestionsModule } from "./questions/questions.module";
import { TopicTestsModule } from "./topic-tests/topic-tests.module";
import { StudentsModule } from "./students/students.module";
import { ParentsModule } from "./parents/parents.module";
import { NotifyModule } from "./notify/notify.module";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { StaffModule } from "./staff/staff.module";
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
        AccessModule,
        UsersModule,
        AuthModule,
        StaffModule,
        ContentModule,
        QuestionsModule,
        TopicTestsModule,
        StudentsModule,
        ParentsModule,
        NotifyModule,
      ],
      controllers: [HealthController],
    };
  }
}
