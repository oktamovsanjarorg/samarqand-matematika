import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { startTutorInput, tutorMessageInput } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { TutorService } from "./tutor.service";

/** AI yordamchi: o'quvchi (va sinab ko'rish uchun xodim). Ota-onaga yopiq */
@Roles("STUDENT", "TEACHER", "ASSISTANT")
@Controller("tutor/chats")
export class TutorController {
  constructor(private readonly tutor: TutorService) {}

  @Post()
  @HttpCode(200)
  start(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.tutor.start(u.sub, parseBody(startTutorInput, body), new Date());
  }

  @Get(":id")
  get(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.tutor.get(u.sub, id, new Date());
  }

  @Post(":id/messages")
  @HttpCode(200)
  send(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.tutor.send(u.sub, id, parseBody(tutorMessageInput, body).text, new Date());
  }
}
