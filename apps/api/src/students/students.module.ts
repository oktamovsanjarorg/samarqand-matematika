import { Module } from "@nestjs/common";
import { AdminStudentsController } from "./admin-students.controller";
import { AdminStudentsService } from "./admin-students.service";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

@Module({
  controllers: [ProfileController, AdminStudentsController],
  providers: [ProfileService, AdminStudentsService],
})
export class StudentsModule {}
