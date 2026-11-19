import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AdminLoginController } from "./admin-login.controller";
import { AdminLoginService } from "./admin-login.service";

@Module({ imports: [UsersModule], controllers: [AdminLoginController], providers: [AdminLoginService] })
export class StaffModule {}
