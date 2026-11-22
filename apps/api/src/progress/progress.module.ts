import { Module } from "@nestjs/common";
import { TopicTestsModule } from "../topic-tests/topic-tests.module";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";

@Module({
  imports: [TopicTestsModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
