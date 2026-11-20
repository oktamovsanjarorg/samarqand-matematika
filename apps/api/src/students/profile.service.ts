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
import { PrismaService } from "../prisma/prisma.service";

/** Telegram raqami "998901234567" yoki "+998 90..." ko'rinishida keladi: "+" va raqamlar qoladi */
export const normalizePhone = (raw: string) => `+${raw.replace(/\D/g, "")}`;

/** O'quvchining o'z profili va onboarding (T-020) */
@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async my(userId: string, role: RoleName): Promise<MyProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true } });
    if (STAFF_ROLES.includes(role)) {
      return {
        fullName: null,
        hasPhone: !!user.phone,
        needsOnboarding: false,
        access: { full: true, accepted: true, mode: "AUTO" },
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
      access: { full: isFullAccess(facts), accepted: facts.accepted, mode: facts.mode },
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
    const res = await this.prisma.user.updateMany({
      where: { telegramId: BigInt(from.id) },
      data: { phone: normalizePhone(contact.phone_number) },
    });
    return { status: res.count ? "saved" : "unknown" };
  }
}
