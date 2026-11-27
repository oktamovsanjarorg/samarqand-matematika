import { Injectable, NotFoundException } from "@nestjs/common";
import {
  MANUAL_MAX_LINES,
  parseStudentLine,
  type StudentBulkInput,
  type StudentBulkResult,
} from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { mergeManualInto } from "./student-link";

type Line = { line: number; text: string };

/** O'quvchini qo'lda kiritish va Telegram'ga avtomatik bog'lash (T-186) */
@Injectable()
export class ManualStudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Har qator "Ism Familiya, telefon"; shu telefonli o'quvchi bor bo'lsa qator o'tkazib yuboriladi */
  async bulk(actorId: string, input: StudentBulkInput): Promise<StudentBulkResult> {
    if (input.groupId && !(await this.prisma.group.count({ where: { id: input.groupId, isActive: true } })))
      throw new NotFoundException("Guruh topilmadi");
    const lines: Line[] = input.text
      .split(/\r?\n/)
      .map((text, i) => ({ line: i + 1, text: text.trim() }))
      .filter((l) => l.text)
      .slice(0, MANUAL_MAX_LINES);
    const out: StudentBulkResult = { created: [], skipped: [] };
    const seen = new Set<string>();
    for (const l of lines) {
      const p = parseStudentLine(l.text);
      if ("error" in p) {
        out.skipped.push({ ...l, reason: p.error });
        continue;
      }
      const reason = seen.has(p.phone) ? "Roʻyxatda ikki marta" : await this.taken(p.phone);
      seen.add(p.phone);
      if (reason) {
        out.skipped.push({ ...l, reason });
        continue;
      }
      const id = await this.create(actorId, p.fullName, p.phone, input.groupId ?? null);
      out.created.push({ id, fullName: p.fullName, phone: p.phone });
    }
    await this.audit.log({
      actorId,
      action: "student.create",
      entity: "User",
      data: { created: out.created.length, skipped: out.skipped.length, groupId: input.groupId ?? null },
    });
    return out;
  }

  private async taken(phone: string): Promise<string | null> {
    const u = await this.prisma.user.findFirst({
      where: { phone },
      select: { role: true, firstName: true, student: { select: { fullName: true } } },
    });
    if (!u) return null;
    if (u.role !== "STUDENT") return "Bu telefon xodim yoki ota-onaga tegishli";
    return `Bu telefon bilan oʻquvchi bor: ${u.student?.fullName ?? u.firstName}`;
  }

  private async create(actorId: string, fullName: string, phone: string, groupId: string | null) {
    const [first = fullName, ...rest] = fullName.split(" ");
    const now = new Date();
    const u = await this.prisma.user.create({
      data: {
        telegramId: null,
        firstName: first,
        lastName: rest.join(" ") || null,
        phone,
        student: {
          create: { fullName, acceptedAt: now, acceptedById: actorId, announcedAt: now, groupId },
        },
      },
      select: { id: true },
    });
    return u.id;
  }

  /**
   * O'quvchi botda raqamini ulashganda (BR-S02): shu telefonli qo'lda kiritilgan yozuv bo'lsa,
   * Telegram'li hisobga birlashtiriladi. Bog'langan bo'lsa true.
   */
  async linkByPhone(userId: string, phone: string): Promise<boolean> {
    const manual = await this.prisma.user.findFirst({
      where: { telegramId: null, role: "STUDENT", phone, id: { not: userId } },
      select: {
        id: true,
        student: {
          select: {
            id: true,
            fullName: true,
            accessMode: true,
            acceptedAt: true,
            acceptedById: true,
            groupId: true,
            parentCode: true,
          },
        },
      },
    });
    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!manual?.student || me?.role !== "STUDENT") return false;
    const from = manual.student;
    await this.prisma.$transaction((tx) => mergeManualInto(tx, manual.id, userId, from));
    await this.audit.log({
      actorId: userId,
      action: "student.link",
      entity: "User",
      entityId: userId,
      data: { from: manual.id },
    });
    return true;
  }
}
