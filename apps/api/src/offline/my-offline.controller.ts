import { Controller, Get, Param } from "@nestjs/common";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { MyOfflineService } from "./my-offline.service";

@Controller("me/offline-results")
export class MyOfflineController {
  constructor(private readonly offline: MyOfflineService) {}

  @Roles("STUDENT")
  @Get()
  list(@CurrentUser() u: JwtUser) {
    return this.offline.list(u.sub);
  }

  /** Bitta natija: o'quvchi o'ziniki, ota-ona tasdiqlangan farzandiniki (T-181) */
  @Roles("STUDENT", "PARENT")
  @Get(":id")
  detail(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.offline.detail({ id: u.sub, role: u.role }, id);
  }
}
