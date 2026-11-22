import { Controller, Get } from "@nestjs/common";
import { CurrentUser, Roles, type JwtUser } from "../auth/decorators";
import { AdvisorService } from "./advisor.service";

/** Maslahatchi (T-161): ustoz va yordamchi; e'lon havolasi faqat ustozga */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/advisor")
export class AdvisorController {
  constructor(private readonly advisor: AdvisorService) {}

  @Get()
  list(@CurrentUser() u: JwtUser) {
    return this.advisor.list(u.role === "TEACHER");
  }
}
