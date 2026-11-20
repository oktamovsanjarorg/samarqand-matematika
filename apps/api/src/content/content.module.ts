import { Module } from "@nestjs/common";
import { AdminContentController } from "./admin-content.controller";
import { AdminCoursesService } from "./admin-courses.service";
import { AdminLessonsService } from "./admin-lessons.service";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";
import { ReorderService } from "./reorder.service";

@Module({
  controllers: [AdminContentController, ContentController],
  providers: [AdminCoursesService, AdminLessonsService, ReorderService, ContentService],
})
export class ContentModule {}
