import { Controller, Get, Query } from "@nestjs/common";
import { auditQuery } from "@samarqand/shared";
import { Roles } from "../auth/decorators";
import { parseBody } from "../common/zod";
import { AuditQueryService } from "./audit-query.service";

/** Jurnal faqat ustozda: yordamchilar amallarini ustoz ko'radi (T-075) */
@Roles("TEACHER")
@Controller("admin/audit")
export class AuditController {
  constructor(private readonly audit: AuditQueryService) {}

  @Get()
  page(@Query() query: unknown) {
    return this.audit.page(parseBody(auditQuery, query));
  }
}
