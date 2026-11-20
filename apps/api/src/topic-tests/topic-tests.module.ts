import { Module } from "@nestjs/common";
import { TopicTestsController } from "./topic-tests.controller";
import { StatsService } from "./stats.service";
import { TopicTestsService } from "./topic-tests.service";

@Module({
  controllers: [TopicTestsController],
  providers: [TopicTestsService, StatsService],
})
export class TopicTestsModule {}
