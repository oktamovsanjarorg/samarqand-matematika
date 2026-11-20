import { Module } from "@nestjs/common";
import { AdminMocksController } from "./admin-mocks.controller";
import { AdminMocksService } from "./admin-mocks.service";
import { AdminExamTemplatesController } from "./admin-exam-templates.controller";
import { ExamTemplatesService } from "./exam-templates.service";

@Module({
  controllers: [AdminExamTemplatesController, AdminMocksController],
  providers: [ExamTemplatesService, AdminMocksService],
})
export class MockModule {}
