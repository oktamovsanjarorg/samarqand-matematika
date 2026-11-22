import { Module } from "@nestjs/common";
import { AdminQuestionsController } from "./admin-questions.controller";
import { AdminQuestionsService } from "./admin-questions.service";
import { QuestionImportService } from "./question-import.service";

@Module({
  controllers: [AdminQuestionsController],
  providers: [AdminQuestionsService, QuestionImportService],
})
export class QuestionsModule {}
