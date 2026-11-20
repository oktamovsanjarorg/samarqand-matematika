import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { parseNumber } from "@samarqand/math";
import type { AdminQuestionDetail, AdminQuestionRow, QuestionInput } from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { toDetail, toStorage } from "./codec";

const ROW = {
  id: true,
  type: true,
  text: true,
  difficulty: true,
  skills: true,
  order: true,
  isPublished: true,
} as const;

/** Son javobi va chegarasi o'qiladigan bo'lishi shart: aks holda hech kim to'g'ri javob bera olmaydi */
function assertCheckable(q: QuestionInput) {
  if (q.type !== "NUMERIC") return;
  if (!parseNumber(q.answer.value)) throw new BadRequestException("answer.value: son sifatida oʻqilmadi");
  if (q.answer.tolerance !== undefined && !parseNumber(q.answer.tolerance))
    throw new BadRequestException("answer.tolerance: son sifatida oʻqilmadi");
}

/** Admin: savollar banki (T-022). Ustoz ham, yordamchi ham boshqaradi */
@Injectable()
export class AdminQuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(topicId: string): Promise<AdminQuestionRow[]> {
    await this.mustTopic(topicId);
    return this.prisma.question.findMany({ where: { topicId }, orderBy: { order: "asc" }, select: ROW });
  }

  async get(id: string): Promise<AdminQuestionDetail> {
    const row = await this.prisma.question.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Savol topilmadi");
    return toDetail(row);
  }

  async create(actorId: string, topicId: string, input: QuestionInput): Promise<AdminQuestionDetail> {
    await this.mustTopic(topicId);
    assertCheckable(input);
    const order = await this.prisma.question.count({ where: { topicId } });
    const row = await this.prisma.question.create({ data: { ...toStorage(input), topicId, order } });
    await this.audit.log({ actorId, action: "question.create", entity: "Question", entityId: row.id });
    return toDetail(row);
  }

  /** To'liq almashtirish: tur o'zgarsa eski variantlar va javob ham almashadi */
  async replace(actorId: string, id: string, input: QuestionInput): Promise<AdminQuestionDetail> {
    await this.get(id);
    assertCheckable(input);
    const row = await this.prisma.question.update({ where: { id }, data: toStorage(input) });
    // Javob auditga yozilmaydi: audit jurnalini ko'rgan kishi javobni bilib qolmasin
    await this.audit.log({
      actorId,
      action: "question.update",
      entity: "Question",
      entityId: id,
      data: { type: input.type },
    });
    return toDetail(row);
  }

  async remove(actorId: string, id: string): Promise<void> {
    await this.get(id);
    await this.prisma.question.delete({ where: { id } });
    await this.audit.log({ actorId, action: "question.delete", entity: "Question", entityId: id });
  }

  private async mustTopic(id: string) {
    if (!(await this.prisma.topic.count({ where: { id } }))) throw new NotFoundException("Mavzu topilmadi");
  }
}
