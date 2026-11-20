import { Controller, Get, Param, Query } from "@nestjs/common";
import { adminTutorQuery } from "@samarqand/shared";
import { Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminTutorService } from "./admin-tutor.service";

/** Ustoz va yordamchi: o'quvchilar suhbatlari (BR-T04) */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/tutor/chats")
export class AdminTutorController {
  constructor(private readonly tutor: AdminTutorService) {}

  @Get()
  list(@Query() query: unknown) {
    return this.tutor.list(parseBody(adminTutorQuery, query));
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.tutor.get(id);
  }
}
