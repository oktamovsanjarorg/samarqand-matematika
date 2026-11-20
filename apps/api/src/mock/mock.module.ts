import { Module } from "@nestjs/common";
import { AdminExamTemplatesController } from "./admin-exam-templates.controller";
import { ExamTemplatesService } from "./exam-templates.service";

@Module({
  controllers: [AdminExamTemplatesController],
  providers: [ExamTemplatesService],
})
export class MockModule {}
