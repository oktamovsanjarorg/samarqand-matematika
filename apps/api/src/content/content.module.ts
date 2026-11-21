import { Module } from "@nestjs/common";
import { AdminContentController } from "./admin-content.controller";
import { AdminCoursesService } from "./admin-courses.service";
import { AdminLessonsService } from "./admin-lessons.service";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";
import { LessonAnnounceService } from "./lesson-announce.service";
import { ReorderService } from "./reorder.service";

@Module({
  controllers: [AdminContentController, ContentController],
  providers: [
    AdminCoursesService,
    AdminLessonsService,
    ReorderService,
    ContentService,
    LessonAnnounceService,
  ],
})
export class ContentModule {}
