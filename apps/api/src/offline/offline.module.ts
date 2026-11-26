import { Module } from "@nestjs/common";
import { MyOfflineController } from "./my-offline.controller";
import { MyOfflineService } from "./my-offline.service";
import { OfflineController } from "./offline.controller";
import { OfflineRankingService } from "./offline-ranking.service";
import { OfflineTemplate } from "./offline-template";
import { OfflineService } from "./offline.service";

@Module({
  controllers: [OfflineController, MyOfflineController],
  providers: [OfflineService, MyOfflineService, OfflineRankingService, OfflineTemplate],
})
export class OfflineModule {}
