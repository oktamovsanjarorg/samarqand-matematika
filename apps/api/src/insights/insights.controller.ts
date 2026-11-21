import { Controller, Get } from "@nestjs/common";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { AttentionService } from "./attention.service";
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

/** Ustoz va yordamchi: e'tibor kerak o'quvchilar (T-063) */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/attention")
export class AttentionController {
  constructor(private readonly attention: AttentionService) {}

  @Get()
  list() {
    return this.attention.list();
  }
}
