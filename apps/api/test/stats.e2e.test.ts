import type { MonthStats } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
let groupId = "";
const at = (iso: string) => new Date(iso);

beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.group.deleteMany({ where: { id: groupId } });
  await f.cleanup();
});

/** Mavzu testi urinishi: har savolga natija (true = to'g'ri) */
async function attempt(
  userId: string,
  qids: string[],
  ok: boolean[],
  o: { at: Date; mistakesOnly?: boolean },
) {
  const q = await f.prisma.question.findUniqueOrThrow({ where: { id: qids[0] }, select: { topicId: true } });
  await f.prisma.topicAttempt.create({
    data: {
      userId,
      topicId: q.topicId,
      submittedAt: o.at,
      mistakesOnly: o.mistakesOnly ?? false,
      answers: {
        create: ok.map((c, i) => ({ questionId: qids[i] ?? "", order: i, result: c ? "CORRECT" : "WRONG" })),
      },
    },
  });
}

describe("Oy statistikasi (T-162)", () => {
  it("2020-yil yanvar: faqat o'quvchilar, 'faqat xatolar' va oy tashqarisi kirmaydi", async () => {
    const qids = await f.questions();
    const [s1, s2, s3] = [await f.student(), await f.student(), await f.student()];
    const staff = await f.student(false);
    // Dekabrda qabul qilingan: yanvarda "yangi" emas
    const old = await f.student();
    await f.prisma.studentProfile.update({
      where: { userId: old.id },
      data: { acceptedAt: at("2020-01-31T19:00:00Z") },
    });
    const older = await f.student();
    await f.prisma.studentProfile.update({
      where: { userId: older.id },
      data: { acceptedAt: at("2019-12-31T18:59:00Z") },
    });
    await f.prisma.user.update({ where: { id: staff.id }, data: { role: "ASSISTANT" } });
    for (const s of [s1, s2, s3])
      await f.prisma.studentProfile.update({
        where: { userId: s.id },
        data: { acceptedAt: at("2020-01-05T10:00:00Z") },
      });

    for (let i = 0; i < 10; i++) {
      await attempt(s1.id, qids, [true, true], { at: at("2020-01-10T10:00:00Z") });
      await attempt(s2.id, qids, [true, false], { at: at("2020-01-11T10:00:00Z") });
    }
    await attempt(s3.id, qids, [false, false], { at: at("2020-01-12T10:00:00Z"), mistakesOnly: true });
    await attempt(staff.id, qids, [false, false], { at: at("2020-01-12T10:00:00Z") });
    // 1-fevral 00:00 Toshkent: yanvarga kirmaydi
    await attempt(s1.id, qids, [false, false], { at: at("2020-01-31T19:00:00Z") });

    const w = await f.prisma.weeklyTest.create({
      data: {
        title: "Statistika haftaligi",
        opensAt: at("2020-01-18T05:00:00Z"),
        closesAt: at("2020-01-20T05:00:00Z"),
        isPublished: true,
        questions: { create: qids.map((questionId, order) => ({ questionId, order })) },
      },
    });
    await f.prisma.weeklyAttempt.createMany({
      data: [
        { weeklyTestId: w.id, userId: s1.id, submittedAt: at("2020-01-19T05:00:00Z"), score: 2 },
        { weeklyTestId: w.id, userId: s2.id, submittedAt: at("2020-01-19T06:00:00Z"), score: 1 },
        { weeklyTestId: w.id, userId: s3.id, submittedAt: null, score: 0 },
      ],
    });
    const g = await f.prisma.group.create({ data: { name: "Statistika guruhi" } });
    groupId = g.id;
    const date = new Date("2020-01-06");
    await f.prisma.attendance.createMany({
      data: [
        { groupId, userId: s1.id, date, status: "PRESENT" },
        { groupId, userId: s2.id, date, status: "ABSENT" },
        { groupId, userId: s3.id, date, status: "EXCUSED" },
      ],
    });

    const res = await f.call("GET", "/admin/stats?month=2020-01", f.teacher);
    expect(res.statusCode).toBe(200);
    const s = res.json() as MonthStats;
    expect(s.month).toBe("2020-01");
    expect(s.students).toMatchObject({ newThisMonth: 3, active: 2 });
    expect(s.topicTests).toEqual({ attempts: 20, correctPercent: 75 });
    expect(s.weekly).toEqual({ tests: 1, submitted: 2, avgPercent: 75 });
    expect(s.top.map((t) => [t.userId, t.percent, t.answers])).toEqual([
      [s1.id, 100, 20],
      [s2.id, 50, 20],
    ]);
    expect(s.attendance).toMatchObject({ rate: 33, marks: 3, absent: 1 });
    expect(s.attendance.byGroup).toEqual([
      { groupId, name: "Statistika guruhi", days: 1, rate: 33, absent: 1 },
    ]);
  });

  it("oxirgi 8 hafta: hozir topshirilgan test oxirgi haftaga tushadi", async () => {
    const qids = await f.questions();
    const s = await f.student();
    await attempt(s.id, qids, [true, true], { at: new Date() });
    const w = ((await f.call("GET", "/admin/stats", f.teacher)).json() as MonthStats).weeks;
    expect(w).toHaveLength(8);
    expect(w[7]?.topicTests).toBeGreaterThanOrEqual(1);
    expect(w[7]?.activeStudents).toBeGreaterThanOrEqual(1);
  });

  it("ruxsat: o'quvchiga 403, tokensiz 401, yordamchiga 200; noto'g'ri oy 400", async () => {
    const s = await f.student();
    expect((await f.call("GET", "/admin/stats", s.headers)).statusCode).toBe(403);
    expect((await f.call("GET", "/admin/stats", {})).statusCode).toBe(401);
    const h = await f.student(false);
    await f.prisma.user.update({ where: { id: h.id }, data: { role: "ASSISTANT" } });
    expect((await f.call("GET", "/admin/stats?month=2020-01", h.headers)).statusCode).toBe(200);
    expect((await f.call("GET", "/admin/stats?month=2020-13", f.teacher)).statusCode).toBe(400);
  });
});
