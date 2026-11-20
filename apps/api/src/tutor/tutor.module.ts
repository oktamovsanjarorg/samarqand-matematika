import { Module } from "@nestjs/common";
import { AdminTutorController } from "./admin-tutor.controller";
import { AdminTutorService } from "./admin-tutor.service";
import { TutorController } from "./tutor.controller";
import { TutorService } from "./tutor.service";

@Module({
  controllers: [TutorController, AdminTutorController],
  providers: [TutorService, AdminTutorService],
})
export class TutorModule {}
