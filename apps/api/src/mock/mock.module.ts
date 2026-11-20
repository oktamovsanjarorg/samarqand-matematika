import { Module } from "@nestjs/common";
import { AdminMocksController } from "./admin-mocks.controller";
import { AdminMocksService } from "./admin-mocks.service";
import { AdminExamTemplatesController } from "./admin-exam-templates.controller";
import { ExamTemplatesService } from "./exam-templates.service";
import { MocksController } from "./mocks.controller";
import { MocksService } from "./mocks.service";

@Module({
  controllers: [AdminExamTemplatesController, AdminMocksController, MocksController],
  providers: [ExamTemplatesService, AdminMocksService, MocksService],
})
export class MockModule {}
