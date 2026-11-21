import { Controller, Get } from "@nestjs/common";
import { Roles } from "../auth/decorators";
import { DashboardService } from "./dashboard.service";

@Roles("TEACHER", "ASSISTANT")
@Controller("admin/dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get() {
    return this.dashboard.get();
  }
}
