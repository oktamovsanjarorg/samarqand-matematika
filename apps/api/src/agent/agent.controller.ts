import { Body, Controller, Get, Headers, HttpCode, Post } from "@nestjs/common";
import { agentChatBody, agentConfirmBody } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AgentService } from "./agent.service";

/** Admin agenti (T-156): ustoz va yordamchi; har amal foydalanuvchining o'z huquqi bilan */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/agent")
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Get()
  status() {
    return { enabled: this.agent.enabled() };
  }

  @Post("chat")
  @HttpCode(200)
  chat(@CurrentUser() u: JwtUser, @Headers("authorization") auth: string, @Body() body: unknown) {
    return this.agent.chat(u, auth, parseBody(agentChatBody, body));
  }

  @Post("confirm")
  @HttpCode(200)
  confirm(@CurrentUser() u: JwtUser, @Headers("authorization") auth: string, @Body() body: unknown) {
    return this.agent.confirm(u, auth, parseBody(agentConfirmBody, body));
  }
}
