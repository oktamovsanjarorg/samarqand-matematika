import { describe, expect, it } from "vitest";
import { setupSteps } from "../src/dashboard/setup-steps";

/** Har jadval uchun count() natijasi */
function fake(n: {
  topic?: number;
  lesson?: number;
  question?: number;
  plan?: number;
  card?: number;
  student?: number;
}) {
  const count = (v = 0) => ({ count: () => Promise.resolve(v) });
  return {
    topic: count(n.topic),
    lesson: count(n.lesson),
    question: count(n.question),
    plan: count(n.plan),
    appSetting: count(n.card),
    studentProfile: count(n.student),
  } as unknown as Parameters<typeof setupSteps>[0];
}

describe("ishni boshlash qadamlari (T-140)", () => {
  it("bo'sh platformada hammasi bajarilmagan", async () => {
    expect(await setupSteps(fake({}))).toEqual({
      course: false,
      lesson: false,
      questions: false,
      billing: false,
      student: false,
    });
  });

  it("to'lov qadami uchun tarif ham, karta ham kerak", async () => {
    expect((await setupSteps(fake({ plan: 1 }))).billing).toBe(false);
    expect((await setupSteps(fake({ card: 1 }))).billing).toBe(false);
    expect(
      await setupSteps(fake({ topic: 2, lesson: 1, question: 5, plan: 1, card: 1, student: 3 })),
    ).toEqual({ course: true, lesson: true, questions: true, billing: true, student: true });
  });
});
