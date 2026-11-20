import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AdminParentsService } from "./admin-parents.service";
import { ParentLinkService } from "./parent-link.service";
import { ParentsController } from "./parents.controller";

@Module({
  imports: [UsersModule],
  controllers: [ParentsController],
  providers: [ParentLinkService, AdminParentsService],
})
export class ParentsModule {}
