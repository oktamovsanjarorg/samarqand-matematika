import { Body, Controller, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { examTemplateInput, examTemplatePatch } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { ExamTemplatesService } from "./exam-templates.service";

/** Imtihon shablonlari: sozlama, o'zgartirish faqat ustozda (BR-M01) */
@Controller("admin/exam-templates")
@Roles("TEACHER")
export class AdminExamTemplatesController {
  constructor(private readonly templates: ExamTemplatesService) {}

  /** Ro'yxat yordamchiga ham: mock tuzishda shablon tanlanadi */
  @Get()
  @Roles("TEACHER", "ASSISTANT")
  list() {
    return this.templates.list();
  }

  @Post()
  create(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.templates.create(u.sub, parseBody(examTemplateInput, body));
  }

  @Put(":id")
  update(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.templates.update(u.sub, id, parseBody(examTemplateInput, body));
  }

  @Patch(":id")
  setActive(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.templates.setActive(u.sub, id, parseBody(examTemplatePatch, body).isActive);
  }
}
