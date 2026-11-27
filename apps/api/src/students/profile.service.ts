import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  STAFF_ROLES,
  type MyProfile,
  type RoleName,
  type UserPhoneBody,
} from "@samarqand/shared";
import { AccessService } from "../access/access.service";
import { isFullAccess } from "../access/access-rules";
import { newStudentText } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { ManualStudentsService } from "./manual-students.service";

/** Telegram raqami "998901234567" yoki "+998 90..." ko'rinishida keladi: "+" va raqamlar qoladi */
export const normalizePhone = (raw: string) => `+${raw.replace(/\D/g, "")}`;

/** O'quvchining o'z profili va onboarding (T-020) */
@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notify: NotifyService,
    private readonly manual: ManualStudentsService,
  ) {}

  async my(userId: string, role: RoleName): Promise<MyProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true } });
    // Xodim va ota-onada o'quvchi profili yo'q: onboarding ham kerak emas
    if (role !== "STUDENT") {
      const full = STAFF_ROLES.includes(role);
      return {
        fullName: null,
        hasPhone: !!user.phone,
        needsOnboarding: false,
        access: { full, accepted: full, parentApproved: full, paid: full, mode: "AUTO" },
      };
    }
    const profile = await this.prisma.studentProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { fullName: true },
    });
    const facts = await this.access.facts(userId);
    return {
      fullName: profile.fullName,
      hasPhone: !!user.phone,
      needsOnboarding: !profile.fullName || !user.phone,
      access: {
        full: isFullAccess(facts),
        accepted: facts.accepted,
        parentApproved: facts.approvedParents > 0,
        paid: facts.paid,
        mode: facts.mode,
      },
    };
  }

  /** BR-S01: ismni o'quvchi o'zi kiritadi, ustoz qabul qilgandan keyin faqat ustoz o'zgartiradi */
  async setName(userId: string, role: RoleName, fullName: string): Promise<MyProfile> {
    if (role !== "STUDENT") throw new ForbiddenException("Faqat oʻquvchi uchun");
    const p = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { acceptedAt: true },
    });
    if (p?.acceptedAt)
      throw new ConflictException({
        code: ERROR_CODES.NAME_LOCKED,
        message: "Ismni oʻzgartirish uchun ustozga yozing",
      });
    await this.prisma.studentProfile.upsert({
      where: { userId },
      update: { fullName },
      create: { userId, fullName },
    });
    return this.my(userId, role);
  }

  /** BR-S02: faqat o'z raqami (Telegram tasdiqlagan contact.user_id = from.id) saqlanadi */
  async savePhone({ from, contact }: UserPhoneBody): Promise<{ status: "saved" | "foreign" | "unknown" }> {
    if (contact.user_id !== from.id) return { status: "foreign" };
    const phone = normalizePhone(contact.phone_number);
    const res = await this.prisma.user.updateMany({
      where: { telegramId: BigInt(from.id) },
      data: { phone },
    });
    if (!res.count) return { status: "unknown" };
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(from.id) },
      select: { id: true },
    });
    // T-186: ustoz qo'lda kiritgan bo'lsa shu hisobga bog'lanadi (qabul qilingan, xabar kerak emas)
    if (user && !(await this.manual.linkByPhone(user.id, phone))) await this.announce(user.id);
    return { status: "saved" };
  }

  /** Ism ham, telefon ham bo'lgach ustozga bir marta xabar boradi (BR-S04) */
  private async announce(userId: string): Promise<void> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, phone: true, student: { select: { fullName: true, acceptedAt: true } } },
    });
    const name = u?.student?.fullName;
    if (u?.role !== "STUDENT" || !u.phone || !name || u.student?.acceptedAt) return;
    // Faqat birinchi marta: parallel so'rovlardan bittasigina announcedAt ni o'rnatadi
    const first = await this.prisma.studentProfile.updateMany({
      where: { userId, announcedAt: null },
      data: { announcedAt: new Date() },
    });
    if (first.count)
      await this.notify.toStaff(
        newStudentText(name, u.phone),
        this.notify.adminButton("Panelni ochish", "students"),
      );
  }
}
