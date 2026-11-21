import { Module } from "@nestjs/common";
import { MyOfflineController } from "./my-offline.controller";
import { MyOfflineService } from "./my-offline.service";
import { OfflineController } from "./offline.controller";
import { OfflineService } from "./offline.service";

@Module({
  controllers: [OfflineController, MyOfflineController],
  providers: [OfflineService, MyOfflineService],
})
export class OfflineModule {}
