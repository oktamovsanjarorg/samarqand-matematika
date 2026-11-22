import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AdminLoginController } from "./admin-login.controller";
import { AdminLoginService } from "./admin-login.service";
import { StaffController } from "./staff.controller";
import { StaffInviteController } from "./staff-invite.controller";
import { StaffInviteService } from "./staff-invite.service";
import { StaffService } from "./staff.service";

@Module({
  imports: [UsersModule],
  controllers: [AdminLoginController, StaffController, StaffInviteController],
  providers: [AdminLoginService, StaffService, StaffInviteService],
})
export class StaffModule {}
