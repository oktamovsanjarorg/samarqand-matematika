import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { TrashService } from "./trash.service";

/** Kontentni o'chira oladiganlar tiklay ham oladi */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin/trash")
export class TrashController {
  constructor(private readonly trash: TrashService) {}

  @Get()
  list() {
    return this.trash.list(new Date());
  }

  @Post(":id/restore")
  @HttpCode(200)
  restore(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.trash.restore(u.sub, id);
  }
}
