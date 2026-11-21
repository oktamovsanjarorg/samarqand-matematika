import type { AdminDashboard } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const offlineIds: string[] = [];
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.offlineTest.deleteMany({ where: { id: { in: offlineIds } } });
  await f.cleanup();
});

const dashboard = async () => (await f.call("GET", "/admin/dashboard", f.teacher)).json() as AdminDashboard;

describe("admin bosh sahifa (T-061)", () => {
  it("kutayotgan ishlar soni o'zgarishga qarab oshadi", async () => {
    const before = await dashboard();
    const child = await f.student();
    const parent = await f.student(false);
    await f.prisma.user.update({ where: { id: parent.id }, data: { role: "PARENT" } });
    const profile = await f.prisma.studentProfile.findUniqueOrThrow({
      where: { userId: child.id },
      select: { id: true },
    });
    await f.prisma.parentLink.create({
      data: { parentId: parent.id, studentId: profile.id, phone: "998900000000" },
    });
    const csv = "Ism;A\nHech kim topilmaydigan ism;1";
    const t = await f.call("POST", "/admin/offline-tests", f.teacher, {
      title: "Bosh sahifa",
      date: "2026-10-01",
      csv,
    });
    offlineIds.push(t.json().id);

    const after = await dashboard();
    expect(after.todo.pendingParents - before.todo.pendingParents).toBe(1);
    expect(after.todo.unmatchedOffline - before.todo.unmatchedOffline).toBe(1);
    expect(after.stats.students).toBeGreaterThanOrEqual(before.stats.students + 1);
    expect(after.stats.activeWeek).toBeLessThanOrEqual(after.stats.students);
    expect(Array.isArray(after.todo.review)).toBe(true);
  });

  it("yopilgan haftalikdagi baholanmagan yechim rasmlari test bo'yicha sanaladi", async () => {
    const [q1, q2] = await f.questions();
    const id = await f.weekly([q1!, q2!]);
    const s = await f.student();
    const a = await f.prisma.weeklyAttempt.create({
      data: { weeklyTestId: id, userId: s.id, submittedAt: new Date() },
      select: { id: true },
    });
    for (const [order, questionId] of [q1!, q2!].entries())
      await f.prisma.weeklyAnswer.create({ data: { attemptId: a.id, questionId, order, response: "x" } });
    await f.prisma.solutionPhoto.create({
      data: { id: `dash-${a.id}`, attemptId: a.id, questionId: q1!, path: "x.jpg", bytes: 1 },
    });
    // Oyna hali ochiq: navbatda yo'q
    expect((await dashboard()).todo.review.find((r) => r.testId === id)).toBeUndefined();
    await f.prisma.weeklyTest.update({ where: { id }, data: { closesAt: new Date(Date.now() - 1000) } });
    expect((await dashboard()).todo.review.find((r) => r.testId === id)).toMatchObject({
      count: 1,
      title: "1-hafta",
    });
    await f.prisma.weeklyAnswer.update({
      where: { attemptId_questionId: { attemptId: a.id, questionId: q1! } },
      data: { reviewedAt: new Date(), teacherPoints: 1 },
    });
    expect((await dashboard()).todo.review.find((r) => r.testId === id)).toBeUndefined();
  });

  it("o'quvchi va ota-onaga 403", async () => {
    const s = await f.student();
    expect((await f.call("GET", "/admin/dashboard", s.headers)).statusCode).toBe(403);
  });
});
