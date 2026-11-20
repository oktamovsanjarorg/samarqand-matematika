import { Module } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";

@Module({ controllers: [GroupsController], providers: [GroupsService, AttendanceService] })
export class GroupsModule {}
