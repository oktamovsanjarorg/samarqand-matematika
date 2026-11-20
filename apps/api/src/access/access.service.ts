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
    const [p, paid] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { userId },
        select: {
          accessMode: true,
          acceptedAt: true,
          _count: { select: { parents: { where: { status: "APPROVED" } } } },
        },
      }),
      // BR-A04 "to'lov qilingan": hozir faol obuna bor (BR-B03)
      this.prisma.subscription.count({ where: { userId, endsAt: { gt: new Date() } } }),
    ]);
    return {
      mode: p?.accessMode ?? "AUTO",
      accepted: !!p?.acceptedAt,
      approvedParents: p?._count.parents ?? 0,
      paid: paid > 0,
    };
  }

  async hasFullAccess(userId: string, role: RoleName): Promise<boolean> {
    if (STAFF_ROLES.includes(role)) return true;
    return isFullAccess(await this.facts(userId));
  }

  /** To'liq kirishli faol o'quvchilar (haftalik test eslatmalari uchun, BR-W07) */
  async fullAccessStudentIds(): Promise<string[]> {
    const now = new Date();
    const rows = await this.prisma.user.findMany({
      where: { role: "STUDENT", isBlocked: false },
      select: {
        id: true,
        student: {
          select: {
            accessMode: true,
            acceptedAt: true,
            _count: { select: { parents: { where: { status: "APPROVED" } } } },
          },
        },
        _count: { select: { subscriptions: { where: { endsAt: { gt: now } } } } },
      },
    });
    return rows
      .filter((u) =>
        isFullAccess({
          mode: u.student?.accessMode ?? "AUTO",
          accepted: !!u.student?.acceptedAt,
          approvedParents: u.student?._count.parents ?? 0,
          paid: u._count.subscriptions > 0,
        }),
      )
      .map((u) => u.id);
  }
}
