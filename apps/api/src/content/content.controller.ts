import { Controller, Get, Param } from "@nestjs/common";
import { CurrentUser, JwtUser } from "../auth/decorators";
import { ContentService } from "./content.service";

/** O'quvchi va boshqa kirgan foydalanuvchilar uchun kontent */
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get("courses")
  courses(@CurrentUser() u: JwtUser) {
    return this.content.courses(u.sub, u.role);
  }

  @Get("lessons/:id")
  lesson(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.content.lesson(u.sub, u.role, id);
  }
}
