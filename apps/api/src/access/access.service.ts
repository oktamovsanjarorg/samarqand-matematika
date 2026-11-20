import { Injectable } from "@nestjs/common";
import { STAFF_ROLES, type RoleName } from "@samarqand/shared";
import { PrismaService } from "../prisma/prisma.service";
import { isFullAccess, type AccessFacts } from "./access-rules";

/** Pullik kontentga kirish. Qaror faqat backend'da qabul qilinadi (BR-A04) */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * O'quvchi haqidagi faktlar. To'lov T-025 da qo'shiladi:
   * ungacha AUTO rejimdagi o'quvchi yopiq, ustoz FREE qilib ochib bera oladi.
   */
  async facts(userId: string): Promise<AccessFacts> {
    const p = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        accessMode: true,
        acceptedAt: true,
        _count: { select: { parents: { where: { status: "APPROVED" } } } },
      },
    });
    return {
      mode: p?.accessMode ?? "AUTO",
      accepted: !!p?.acceptedAt,
      approvedParents: p?._count.parents ?? 0,
      paid: false,
    };
  }

  async hasFullAccess(userId: string, role: RoleName): Promise<boolean> {
    if (STAFF_ROLES.includes(role)) return true;
    return isFullAccess(await this.facts(userId));
  }
}
