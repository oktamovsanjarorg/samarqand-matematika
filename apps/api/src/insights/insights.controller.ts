import { Controller, Get } from "@nestjs/common";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { StudentInsightsService } from "./student-insights.service";

@Roles("STUDENT")
@Controller("me/recommendations")
export class InsightsController {
  constructor(private readonly insights: StudentInsightsService) {}

  @Get()
  get(@CurrentUser() u: JwtUser) {
    return this.insights.recommendations(u.sub);
  }
}
