import { Module } from "@nestjs/common";
import { MediaModule } from "../storage/media.module";
import { AdminTutorController } from "./admin-tutor.controller";
import { AdminTutorService } from "./admin-tutor.service";
import { TutorController } from "./tutor.controller";
import { TutorPhotosService } from "./tutor-photos.service";
import { TutorService } from "./tutor.service";

@Module({
  imports: [MediaModule],
  controllers: [TutorController, AdminTutorController],
  providers: [TutorService, AdminTutorService, TutorPhotosService],
})
export class TutorModule {}
