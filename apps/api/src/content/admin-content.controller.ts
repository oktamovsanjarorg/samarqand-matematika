import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { courseInput, lessonInput, reorderBody, topicInput } from "@samarqand/shared";
import { CurrentUser, JwtUser, Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AdminCoursesService } from "./admin-courses.service";
import { AdminLessonsService } from "./admin-lessons.service";
import { ReorderService } from "./reorder.service";

/** Kontent boshqaruvi: ustoz va yordamchi (docs/02-roles-permissions.md) */
@Roles("TEACHER", "ASSISTANT")
@Controller("admin")
export class AdminContentController {
  constructor(
    private readonly courses: AdminCoursesService,
    private readonly lessons: AdminLessonsService,
    private readonly order: ReorderService,
  ) {}

  @Get("courses")
  tree() {
    return this.courses.tree();
  }

  @Post("courses")
  createCourse(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.courses.createCourse(u.sub, parseBody(courseInput, body));
  }

  @Patch("courses/:id")
  updateCourse(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.courses.updateCourse(u.sub, id, parseBody(courseInput.partial(), body));
  }

  @Delete("courses/:id")
  @HttpCode(204)
  deleteCourse(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.courses.deleteCourse(u.sub, id);
  }

  @Post("courses/:id/topics")
  createTopic(@CurrentUser() u: JwtUser, @Param("id") courseId: string, @Body() body: unknown) {
    return this.courses.createTopic(u.sub, courseId, parseBody(topicInput, body));
  }

  @Patch("topics/:id")
  updateTopic(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.courses.updateTopic(u.sub, id, parseBody(topicInput, body));
  }

  @Delete("topics/:id")
  @HttpCode(204)
  deleteTopic(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.courses.deleteTopic(u.sub, id);
  }

  @Post("topics/:id/lessons")
  createLesson(@CurrentUser() u: JwtUser, @Param("id") topicId: string, @Body() body: unknown) {
    return this.lessons.create(u.sub, topicId, parseBody(lessonInput, body));
  }

  @Get("lessons/:id")
  getLesson(@Param("id") id: string) {
    return this.lessons.get(id);
  }

  @Patch("lessons/:id")
  updateLesson(@CurrentUser() u: JwtUser, @Param("id") id: string, @Body() body: unknown) {
    return this.lessons.update(u.sub, id, parseBody(lessonInput.partial(), body));
  }

  @Delete("lessons/:id")
  @HttpCode(204)
  deleteLesson(@CurrentUser() u: JwtUser, @Param("id") id: string) {
    return this.lessons.remove(u.sub, id);
  }

  @Post("reorder")
  @HttpCode(204)
  reorder(@CurrentUser() u: JwtUser, @Body() body: unknown) {
    return this.order.reorder(u.sub, parseBody(reorderBody, body));
  }
}
