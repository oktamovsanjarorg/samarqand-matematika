import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import { adminTutorQuery } from "@samarqand/shared";
import { Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import type { FastifyReply } from "fastify";
import { AdminTutorService } from "./admin-tutor.service";
import { TutorPhotosService } from "./tutor-photos.service";

/** Ustoz va yordamchi: o'quvchilar suhbatlari (BR-T04) */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/tutor")
export class AdminTutorController {
  constructor(
    private readonly tutor: AdminTutorService,
    private readonly photos: TutorPhotosService,
  ) {}

  @Get("chats")
  list(@Query() query: unknown) {
    return this.tutor.list(parseBody(adminTutorQuery, query));
  }

  @Get("chats/:id")
  get(@Param("id") id: string) {
    return this.tutor.get(id);
  }

  @Get("photos/:photoId")
  async photo(@Param("photoId") photoId: string, @Res() res: FastifyReply) {
    const r = await this.photos.read(photoId);
    return res.header("Content-Type", r.type).header("Cache-Control", "private, no-store").send(r.body);
  }
}
