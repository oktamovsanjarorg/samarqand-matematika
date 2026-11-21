import { Injectable, NotFoundException } from "@nestjs/common";
import {
  parseQuestionCsv,
  type QuestionCsvError,
  type QuestionImportInput,
  type QuestionImportResult,
} from "@samarqand/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { checkIssue } from "./checkable";
import { toStorage } from "./codec";

const ISSUE_LABELS = { "answer.value": "Javob", "answer.tolerance": "Xatolik chegarasi" } as const;

/**
 * Excel (CSV) dan savol import (T-100). Avval tekshirish (dryRun), keyin hammasi bir tranzaksiyada.
 * Bitta qator xato bo'lsa ham hech narsa saqlanmaydi: ustoz faylni tuzatib qayta yuklaydi.
 * Savollar qoralama bo'lib tushadi: ustoz ko'rib nashr qiladi.
 */
@Injectable()
export class QuestionImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async run(actorId: string, topicId: string, input: QuestionImportInput): Promise<QuestionImportResult> {
    if (!(await this.prisma.topic.count({ where: { id: topicId } })))
      throw new NotFoundException("Mavzu topilmadi");
    const parsed = parseQuestionCsv(input.csv);
    const errors: QuestionCsvError[] = [...parsed.errors];
    const ok = parsed.rows.filter((r) => {
      const issue = checkIssue(r.input);
      if (issue) errors.push({ line: r.line, message: `${ISSUE_LABELS[issue.path]}: ${issue.message}` });
      return !issue;
    });
    errors.sort((a, b) => a.line - b.line);
    const ready = ok.map((r) => ({ line: r.line, type: r.input.type, text: r.input.text.slice(0, 300) }));
    if (input.dryRun || errors.length > 0 || ok.length === 0) return { ready, errors, created: 0 };

    const order = await this.prisma.question.count({ where: { topicId } });
    await this.prisma.$transaction(
      ok.map((r, i) =>
        this.prisma.question.create({
          data: { ...toStorage({ ...r.input, isPublished: false }), topicId, order: order + i },
        }),
      ),
    );
    await this.audit.log({
      actorId,
      action: "question.import",
      entity: "Topic",
      entityId: topicId,
      data: { count: ok.length },
    });
    return { ready, errors, created: ok.length };
  }
}
