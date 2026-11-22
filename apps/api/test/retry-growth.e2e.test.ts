import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { retryGrowth } from "../src/dashboard/retry-growth";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.cleanup();
});

const MIN = 60_000;

describe("qayta ishlashda o'sish (T-133, 00-vision)", () => {
  it("oldingi urinishdan yuqori natija 'oshgan', xatolar ustida ishlash va birinchi urinish hisobga kirmaydi", async () => {
    const [q1, q2] = await f.questions();
    const { topicId } = await f.prisma.question.findUniqueOrThrow({
      where: { id: q1 ?? "" },
      select: { topicId: true },
    });
    const s = await f.student();
    const now = new Date();
    const before = await retryGrowth(f.prisma, now);
    /** Urinish: correct ta to'g'ri, 2 ta savol; ago daqiqa oldin topshirilgan */
    const attempt = (correct: number, ago: number, mistakesOnly = false) =>
      f.prisma.topicAttempt.create({
        data: {
          userId: s.id,
          topicId,
          correct,
          mistakesOnly,
          submittedAt: new Date(now.getTime() - ago * MIN),
          answers: {
            create: [
              { questionId: q1 ?? "", order: 0 },
              { questionId: q2 ?? "", order: 1 },
            ],
          },
        },
      });
    await attempt(1, 30); // birinchi: 50%
    await attempt(2, 20, true); // xatolar ustida: hisobga kirmaydi
    await attempt(2, 10); // qayta: 100% → oshgan
    await attempt(1, 5); // yana: 50% → oshmagan
    const after = await retryGrowth(f.prisma, now);
    expect(after.retries - before.retries).toBe(2);
    expect(after.improved - before.improved).toBe(1);

    const d = (await f.call("GET", "/admin/dashboard", f.teacher)).json() as {
      stats: { retries: { count: number; improved: number } };
    };
    expect(d.stats.retries.count).toBeGreaterThanOrEqual(2);
  });
});
