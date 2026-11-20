import { Module } from "@nestjs/common";
import { TopicTestsController } from "./topic-tests.controller";
import { TopicTestsService } from "./topic-tests.service";

@Module({
  controllers: [TopicTestsController],
  providers: [TopicTestsService],
})
export class TopicTestsModule {}
