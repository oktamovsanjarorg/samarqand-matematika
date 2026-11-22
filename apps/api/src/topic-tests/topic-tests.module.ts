import { Module } from "@nestjs/common";
import { TopicTestsController } from "./topic-tests.controller";
import { MistakesService } from "./mistakes.service";
import { StatsService } from "./stats.service";
import { TopicTestsService } from "./topic-tests.service";

@Module({
  controllers: [TopicTestsController],
  providers: [TopicTestsService, StatsService, MistakesService],
  exports: [StatsService],
})
export class TopicTestsModule {}
