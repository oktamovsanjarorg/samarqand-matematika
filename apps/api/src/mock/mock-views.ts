import type { Prisma } from "@samarqand/db";
import {
  approxScaled,
  examMaxRaw,
  gradeOf,
  type CheckResult,
  type ExamTemplateInput,
  type MockAttemptView,
  type MockSectionResult,
} from "@samarqand/shared";
import { toView } from "../questions/codec";
import { resultItems } from "../topic-tests/attempt-views";
import { snapshotOf } from "./admin-mocks.service";

export const MOCK_ATTEMPT_INCLUDE = {
  mockTest: { select: { title: true, closesAt: true, template: true, raschN: true } },
  answers: { orderBy: { order: "asc" }, include: { question: true } },
} as const;
export type MockAttemptRow = Prisma.MockAttemptGetPayload<{ include: typeof MOCK_ATTEMPT_INCLUDE }>;

type Graded = { section: number; result: CheckResult | null };

/** Savol bali: to'g'ri bo'lsa bo'lim bali. Moslashtirish tekshiruvda faqat to'liq to'g'ri bo'ladi (BR-M03) */
export const pointsOf = (t: ExamTemplateInput, x: Graded) =>
  x.result === "CORRECT" ? (t.sections[x.section]?.points ?? 0) : 0;

const round2 = (n: number) => Math.round(n * 100) / 100;

export const rawOf = (t: ExamTemplateInput, answers: Graded[]) =>
  round2(answers.reduce((n, x) => n + pointsOf(t, x), 0));

export function sectionResults(t: ExamTemplateInput, answers: Graded[]): MockSectionResult[] {
  return t.sections.map((s, i) => {
    const mine = answers.filter((x) => x.section === i);
    const correct = mine.filter((x) => x.result === "CORRECT").length;
    return {
      title: s.title,
      correct,
      total: mine.length,
      raw: round2(correct * s.points),
      maxRaw: round2(mine.length * s.points),
    };
  });
}

/**
 * Urinish ko'rinishi vaqtga bog'liq: oyna yopilgan — natija va to'g'ri javoblar; topshirilgan — kutish;
 * aks holda savollar (to'g'ri javobsiz). Vaqti o'tgan urinish oldin xizmatda yakunlanadi.
 */
export function mockView(a: MockAttemptRow, now: Date): MockAttemptView {
  const t = snapshotOf(a.mockTest.template);
  const base = { id: a.id, mockTestId: a.mockTestId, title: a.mockTest.title };
  if (now >= a.mockTest.closesAt) {
    const raw = a.submittedAt ? (a.raw ?? 0) : 0;
    const maxRaw = examMaxRaw(t.sections);
    const scaled = a.scaled ?? approxScaled(raw, maxRaw, t.scaleMax);
    const graded = a.submittedAt ? a.answers : a.answers.map((x) => ({ ...x, result: "WRONG" as const }));
    const items = resultItems(graded).map((i, n) => {
      const section = a.answers[n]?.section ?? 0;
      return { ...i, section, points: pointsOf(t, { section, result: i.result }) };
    });
    return {
      ...base,
      status: "RESULT",
      submittedAt: a.submittedAt?.toISOString() ?? null,
      raw,
      maxRaw,
      scaled,
      scaleMax: t.scaleMax,
      grade: gradeOf(scaled, t.grades),
      approx: a.mockTest.raschN === null,
      sections: sectionResults(t, graded),
      items,
    };
  }
  if (a.submittedAt)
    return {
      status: "WAITING",
      id: a.id,
      title: a.mockTest.title,
      submittedAt: a.submittedAt.toISOString(),
      closesAt: a.mockTest.closesAt.toISOString(),
    };
  return {
    ...base,
    status: "OPEN",
    startedAt: a.startedAt.toISOString(),
    deadline: a.deadline.toISOString(),
    sections: t.sections.map((s) => ({ title: s.title, count: s.count, points: s.points })),
    questions: a.answers.map((x) => ({
      section: x.section,
      question: toView(x.question),
      response: x.response,
    })),
  };
}
