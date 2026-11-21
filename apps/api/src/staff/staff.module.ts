import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AdminLoginController } from "./admin-login.controller";
import { AdminLoginService } from "./admin-login.service";
import { StaffController } from "./staff.controller";
import { StaffService } from "./staff.service";

@Module({
  imports: [UsersModule],
  controllers: [AdminLoginController, StaffController],
  providers: [AdminLoginService, StaffService],
})
export class StaffModule {}
