import { Controller, Get } from "@nestjs/common";
import type { BotInvite } from "@samarqand/shared";
import { Roles } from "../auth/decorators";
import { NotifyService } from "../notify/notify.service";
import { DashboardService } from "./dashboard.service";

@Roles("TEACHER", "ASSISTANT")
@Controller("admin/dashboard")
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly notify: NotifyService,
  ) {}

  @Get()
  get() {
    return this.dashboard.get();
  }

  /** O'quvchilarga yuboriladigan bot havolasi (T-143) */
  @Get("invite")
  async invite(): Promise<BotInvite> {
    return { link: await this.notify.botLink() };
  }
}
