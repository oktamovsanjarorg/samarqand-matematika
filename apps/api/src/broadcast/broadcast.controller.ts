import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { broadcastInput } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { BroadcastService } from "./broadcast.service";

/** E'lonni faqat ustoz yuboradi: hamma o'quvchi va ota-onaga ketadigan xabar (T-116) */
@Roles("TEACHER")
@Controller("admin/broadcast")
export class BroadcastController {
  constructor(private readonly broadcast: BroadcastService) {}

  @Post()
  @HttpCode(200)
  send(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.broadcast.send(u.sub, parseBody(broadcastInput, body));
  }
}
