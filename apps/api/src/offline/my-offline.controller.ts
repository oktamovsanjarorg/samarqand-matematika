import { Controller, Get } from "@nestjs/common";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { MyOfflineService } from "./my-offline.service";

@Roles("STUDENT")
@Controller("me/offline-results")
export class MyOfflineController {
  constructor(private readonly offline: MyOfflineService) {}

  @Get()
  list(@CurrentUser() u: JwtUser) {
    return this.offline.list(u.sub);
  }
}
