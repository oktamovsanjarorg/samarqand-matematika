import { Controller, Get } from "@nestjs/common";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { ProgressService } from "./progress.service";

/** O'quvchining yutuqlari (T-169): faqat o'zi */
@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get("me/progress")
  @Roles("STUDENT")
  my(@CurrentUser() u: JwtUser) {
    return this.progress.my(u.sub);
  }
}
