import { Injectable } from "@nestjs/common";
import type { Prisma } from "@samarqand/db";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string;
  data?: Prisma.InputJsonValue;
}

/** Har yozish amali audit log'ga tushadi: kim, nima, qachon */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({ data: entry });
  }
}
