import type { MyRecommendations } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(() => f.cleanup());

type R = "CORRECT" | "WRONG";
async function topicAttempt(userId: string, topicId: string, answers: [string, R][]) {
  await f.prisma.topicAttempt.create({
    data: {
      userId,
      topicId,
      submittedAt: new Date(),
      answers: {
        create: answers.map(([questionId, result], order) => ({ questionId, order, result, response: "x" })),
      },
    },
  });
}

const recs = async (h: Record<string, string>) =>
  (await f.call("GET", "/me/recommendations", h)).json() as MyRecommendations;

describe("o'quvchiga tavsiya (T-062, BR-R01)", () => {
  it("kuchsiz mavzu faktlar bilan; ochiq haftalik hisobga kirmaydi, yopilgach kiradi", async () => {
    const [q1, q2] = await f.questions();
    const q = await f.prisma.question.findUniqueOrThrow({ where: { id: q1! }, select: { topicId: true } });
    await f.prisma.question.update({ where: { id: q1! }, data: { skills: ["kasrlar"] } });
    const s = await f.student();
    expect(await recs(s.headers)).toEqual({ basis: 0, items: [] });

    await topicAttempt(s.id, q.topicId, [
      [q1!, "WRONG"],
      [q2!, "CORRECT"],
    ]);
    await topicAttempt(s.id, q.topicId, [
      [q1!, "WRONG"],
      [q2!, "WRONG"],
    ]);
    const r = await recs(s.headers);
    expect(r.basis).toBe(4);
    expect(r.items).toEqual([
      expect.objectContaining({
        topicId: q.topicId,
        correct: 1,
        total: 4,
        percent: 25,
        sources: { topic: 4, weekly: 0, mock: 0 },
        weakSkills: ["kasrlar"],
      }),
    ]);

    // Ochiq haftalik: javob natijasi tavsiyaga ta'sir qilmaydi (to'g'ri javob sizmaydi)
    const wid = await f.weekly([q1!, q2!]);
    const a = await f.prisma.weeklyAttempt.create({
      data: { weeklyTestId: wid, userId: s.id, submittedAt: new Date() },
    });
    await f.prisma.weeklyAnswer.create({
      data: { attemptId: a.id, questionId: q1!, order: 0, result: "CORRECT" },
    });
    await f.prisma.weeklyAnswer.create({
      data: { attemptId: a.id, questionId: q2!, order: 1, result: "WRONG", teacherPoints: 1 },
    });
    expect((await recs(s.headers)).basis).toBe(4);
    await f.prisma.weeklyTest.update({ where: { id: wid }, data: { closesAt: new Date(Date.now() - 1000) } });
    const closed = await recs(s.headers);
    expect(closed.basis).toBe(6);
    // Ustoz bahosi ustun: q2 to'g'ri sanaladi → 3/6 = 50%
    expect(closed.items[0]).toMatchObject({
      correct: 3,
      total: 6,
      percent: 50,
      sources: { topic: 4, weekly: 2, mock: 0 },
    });
  });

  it("xodimga 403", async () => {
    expect((await f.call("GET", "/me/recommendations", f.teacher)).statusCode).toBe(403);
  });
});
