import { Injectable, NotFoundException } from "@nestjs/common";
import { approxScaled, examMaxRaw, gradeOf, type AdminMockResults } from "@samarqand/shared";
import { personName, PERSON_SELECT } from "../common/person";
import { PrismaService } from "../prisma/prisma.service";
import { snapshotOf } from "./admin-mocks.service";
import { sectionResults } from "./mock-views";
import { MocksService } from "./mocks.service";
import { RANKED } from "../common/ranked";

/** Ustoz: mock natijalari. Yopilgach saqlangan shkala balli, ochiq paytda taxminiy */
@Injectable()
export class MockResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mocks: MocksService,
  ) {}

  async results(id: string, now = new Date()): Promise<AdminMockResults> {
    await this.mocks.finalizeExpired({ mockTestId: id }, now);
    const m = await this.prisma.mockTest.findUnique({
      where: { id },
      select: {
        template: true,
        closedAt: true,
        raschN: true,
        attempts: {
          where: RANKED,
          select: {
            userId: true,
            submittedAt: true,
            raw: true,
            scaled: true,
            user: { select: PERSON_SELECT },
            answers: { select: { section: true, result: true } },
          },
        },
      },
    });
    if (!m) throw new NotFoundException("Mock topilmadi");
    const t = snapshotOf(m.template);
    const maxRaw = examMaxRaw(t.sections);
    const rows = m.attempts.map((a) => {
      const done = a.submittedAt !== null;
      const scaled = done ? (a.scaled ?? approxScaled(a.raw ?? 0, maxRaw, t.scaleMax)) : null;
      return {
        userId: a.userId,
        name: personName(a.user),
        submittedAt: a.submittedAt?.toISOString() ?? null,
        raw: done ? (a.raw ?? 0) : null,
        scaled,
        grade: scaled === null ? null : gradeOf(scaled, t.grades),
        sections: done ? sectionResults(t, a.answers).map((s) => s.raw) : [],
      };
    });
    rows.sort((x, y) => (y.scaled ?? -1) - (x.scaled ?? -1) || x.name.localeCompare(y.name));
    return {
      method: !m.closedAt ? "OPEN" : m.raschN === null ? "APPROX" : "RASCH",
      submitted: rows.filter((r) => r.submittedAt).length,
      maxRaw,
      scaleMax: t.scaleMax,
      sectionTitles: t.sections.map((s) => s.title),
      rows,
    };
  }
}
