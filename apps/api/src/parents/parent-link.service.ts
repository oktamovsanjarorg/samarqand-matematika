import { Injectable } from "@nestjs/common";
import { Prisma } from "@samarqand/db";
import {
  MAX_PARENTS,
  type ChildView,
  type ParentFlag,
  type ParentLinkBody,
  type ParentLinkResult,
  type TelegramProfile,
} from "@samarqand/shared";
import { randomBytes } from "node:crypto";
import { parentRequestText, parentRequestToStudent } from "../notify/messages";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { normalizePhone } from "../students/profile.service";
import { UsersService } from "../users/users.service";

const MANY_CHILDREN = 3;
const ACTIVE = { status: { in: ["PENDING", "APPROVED"] } } satisfies Prisma.ParentLinkWhereInput;
const nameOf = (u: { firstName: string; lastName: string | null }, fullName?: string | null) =>
  fullName ?? [u.firstName, u.lastName].filter(Boolean).join(" ");

/** Ota-ona ulanishi: bot tomoni (T-020b). Ustoz tasdig'i AdminParentsService'da */
@Injectable()
export class ParentLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly notify: NotifyService,
  ) {}

  /** O'quvchining ota-ona kodi: birinchi so'ralganda yaratiladi */
  async codeFor(from: TelegramProfile): Promise<{ code: string | null }> {
    const user = await this.prisma.user.findUnique({ where: { telegramId: BigInt(from.id) } });
    if (user?.role !== "STUDENT") return { code: null };
    const profile = await this.prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    if (profile.parentCode) return { code: profile.parentCode };
    for (let i = 0; i < 3; i++) {
      const code = randomBytes(4).toString("hex").toUpperCase();
      try {
        await this.prisma.studentProfile.update({ where: { id: profile.id }, data: { parentCode: code } });
        return { code };
      } catch (e) {
        // Juda kam uchraydigan to'qnashuv: boshqa kod bilan qayta urinamiz
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
    throw new Error("Ota-ona kodi yaratilmadi");
  }

  /**
   * Ota-ona havola orqali kirib, o'z raqamini ulashdi. So'rov ustoz navbatiga tushadi (PENDING).
   * Firibgarlikka qarshi: faqat o'z raqami, o'quvchi o'ziga ulana olmaydi, shubhali holatlar belgilanadi.
   */
  async link({ code, from, contact }: ParentLinkBody): Promise<ParentLinkResult> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { parentCode: code },
      include: { user: true, _count: { select: { parents: { where: ACTIVE } } } },
    });
    if (!student) return { status: "invalid_code" };
    if (contact.user_id !== from.id) return { status: "not_own_contact" };
    if (student.user.telegramId === BigInt(from.id)) return { status: "self" };

    const parent = await this.users.upsertFromTelegram(from);
    const studentName = nameOf(student.user, student.fullName);
    const refusal = await this.refusal(parent, {
      id: student.id,
      name: studentName,
      active: student._count.parents,
    });
    if (refusal) return refusal;

    const phone = normalizePhone(contact.phone_number);
    const flags = await this.flags(parent.id, phone, student.user.phone);
    await this.prisma.$transaction([
      this.prisma.parentLink.create({ data: { parentId: parent.id, studentId: student.id, phone, flags } }),
      this.prisma.user.update({
        where: { id: parent.id },
        // Ilovada ishlamagan oddiy hisob ota-ona roliga o'tadi; xodimlarga tegilmaydi
        data: {
          phone,
          ...(parent.role === "STUDENT" && !flags.includes("parent_activity") ? { role: "PARENT" } : {}),
        },
      }),
    ]);
    const parentName = nameOf(parent);
    await this.notify.toStaff(
      parentRequestText({ parent: parentName, student: studentName, phone, flags }),
      this.notify.adminButton("Koʻrib chiqish", "parents"),
    );
    await this.notify.toUser(student.userId, parentRequestToStudent(parentName));
    return { status: "created", studentName };
  }

  /** Ulanishga to'sqinlik bormi: qabul qilingan o'quvchi, oldin rad etilgan, allaqachon bor yoki limit */
  private async refusal(
    parent: { id: string; role: string },
    student: { id: string; name: string; active: number },
  ): Promise<ParentLinkResult | null> {
    const [own, existing] = await Promise.all([
      this.prisma.studentProfile.findUnique({ where: { userId: parent.id }, select: { acceptedAt: true } }),
      this.prisma.parentLink.findUnique({
        where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
        select: { status: true },
      }),
    ]);
    // Ustoz qabul qilgan o'quvchi boshqa o'quvchining ota-onasi bo'la olmaydi: hisobi ota-onaga aylanib qolmasin
    if (parent.role === "STUDENT" && own?.acceptedAt) return { status: "is_student" };
    if (existing?.status === "REJECTED") return { status: "rejected_before" };
    if (existing) return { status: "exists", studentName: student.name };
    return student.active >= MAX_PARENTS ? { status: "limit" } : null;
  }

  private async flags(parentId: string, phone: string, studentPhone: string | null): Promise<ParentFlag[]> {
    const [activity, children] = await Promise.all([
      this.prisma.topicAttempt.count({ where: { userId: parentId } }),
      this.prisma.parentLink.count({ where: { parentId, ...ACTIVE } }),
    ]);
    const flags: ParentFlag[] = [];
    if (studentPhone && normalizePhone(studentPhone) === phone) flags.push("same_phone");
    if (activity > 0) flags.push("parent_activity");
    if (children + 1 >= MANY_CHILDREN) flags.push("many_children");
    return flags;
  }

  /** Ota-onaning tasdiqlangan farzandlari */
  async children(parentId: string): Promise<ChildView[]> {
    const links = await this.prisma.parentLink.findMany({
      where: { parentId, status: "APPROVED" },
      orderBy: { createdAt: "asc" },
      select: {
        student: {
          select: { id: true, fullName: true, user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    return links.map(({ student }) => ({
      studentId: student.id,
      name: nameOf(student.user, student.fullName),
    }));
  }
}
