import { Module } from "@nestjs/common";
import { AttendanceMonthService } from "./attendance-month.service";
import { AttendanceService } from "./attendance.service";
import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";

@Module({
  controllers: [GroupsController],
  providers: [GroupsService, AttendanceService, AttendanceMonthService],
})
export class GroupsModule {}
