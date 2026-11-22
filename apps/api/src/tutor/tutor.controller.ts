import { Body, Controller, Get, HttpCode, Param, Post, Res } from "@nestjs/common";
import { startTutorInput, tutorMessageInput } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import type { FastifyReply } from "fastify";
import { TutorPhotosService } from "./tutor-photos.service";
import { TutorService } from "./tutor.service";

/** AI yordamchi: o'quvchi (va sinab ko'rish uchun xodim). Ota-onaga yopiq */
@Roles("STUDENT", "TEACHER", "ASSISTANT")
@Controller("tutor")
export class TutorController {
  constructor(
    private readonly tutor: TutorService,
    private readonly photos: TutorPhotosService,
  ) {}

  @Post("chats")
  @HttpCode(200)
  start(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.tutor.start(u.sub, parseBody(startTutorInput, body), new Date());
  }

  @Get("chats/:id")
  get(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.tutor.get(u.sub, id, new Date());
  }

  @Post("chats/:id/messages")
  @HttpCode(200)
  send(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.tutor.send(u.sub, id, parseBody(tutorMessageInput, body), new Date());
  }

  /** T-170: savolga rasm. Tana rasm baytlari (image/jpeg, png, webp), keyin xabar photoId bilan yuboriladi */
  @Post("chats/:id/photos")
  addPhoto(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.photos.add(u.sub, id, body);
  }

  @Get("photos/:photoId")
  async photo(@CurrentUser() u: JwtUser, @Param("photoId") photoId: string, @Res() res: FastifyReply) {
    const r = await this.photos.readOwn(u.sub, photoId);
    return res.header("Content-Type", r.type).header("Cache-Control", "private, no-store").send(r.body);
  }
}
