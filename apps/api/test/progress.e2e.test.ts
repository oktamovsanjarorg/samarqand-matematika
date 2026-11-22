import type { MyProgress } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
let groupId = "";
const DAY = 24 * 3_600_000;

beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.group.deleteMany({ where: { id: groupId } });
  await f.cleanup();
});

/** Topshirilgan mavzu testi: har savolga natija (true = to'g'ri, null = bo'sh qoldirilgan) */
async function attempt(userId: string, qids: string[], ok: (boolean | null)[], at: Date) {
  const q = await f.prisma.question.findUniqueOrThrow({ where: { id: qids[0] }, select: { topicId: true } });
  await f.prisma.topicAttempt.create({
    data: {
      userId,
      topicId: q.topicId,
      submittedAt: at,
      correct: ok.filter(Boolean).length,
      answers: {
        create: ok.map((c, i) => ({
          questionId: qids[i] ?? "",
          order: i,
          ...(c === null ? {} : { response: { value: "x" } }),
          result: c ? "CORRECT" : "WRONG",
        })),
      },
    },
  });
}

const get = async (h: Record<string, string>) => {
  const res = await f.call("GET", "/me/progress", h);
  expect(res.statusCode).toBe(200);
  return res.json() as MyProgress;
};

describe("O'quvchi yutuqlari (T-169)", () => {
  it("BR-R05: seriya, 7 kun, o'zlashtirish, haftalik o'rni, davomat; faqat o'z ma'lumoti", async () => {
    const qids = await f.questions();
    const q = await f.prisma.question.findUniqueOrThrow({
      where: { id: qids[0] },
      select: { topic: { select: { courseId: true } } },
    });
    await f.prisma.course.update({ where: { id: q.topic.courseId }, data: { isPublished: true } });
    await f.prisma.question.updateMany({ where: { id: { in: qids } }, data: { isPublished: true } });
    const s = await f.student();
    const other = await f.student();
    // Nashr qilinmagan kursdagi mavzu: o'zlashtirishga kirmaydi
    const hidden = await f.questions();
    await attempt(s.id, hidden, [true, true], new Date(Date.now() - 3 * DAY));

    const now = new Date();
    await attempt(s.id, qids, [true, false], now);
    // Kecha: bitta savol bo'sh qoldirilgan, faollikka 1 ta javob
    await attempt(s.id, qids, [true, null], new Date(now.getTime() - DAY));
    let p = await get(s.headers);
    expect(p.streak).toMatchObject({ current: 2, activeToday: true });
    expect(p.week).toHaveLength(7);
    expect(p.week[6]?.answers).toBe(2);
    expect(p.week[5]?.answers).toBe(1);
    expect(p.topics.started).toBe(1);
    expect(p.topics.mastered).toBe(0);
    expect(p.topics.available).toBeGreaterThanOrEqual(1);
    // Bo'sh javob ham avtomatik tekshirilgan (WRONG); yashirin mavzu urinishi ham hisobda
    expect(p.answers).toEqual({ checked: 6, correct: 4 });
    expect(p.badges.find((b) => b.key === "first-test")?.done).toBe(true);
    expect(p.badges.find((b) => b.key === "mastered-1")?.done).toBe(false);

    // 100% natija: mavzu o'zlashtirildi
    await attempt(s.id, qids, [true, true], now);
    p = await get(s.headers);
    expect(p.topics.mastered).toBe(1);
    expect(p.badges.find((b) => b.key === "mastered-1")?.done).toBe(true);

    // Yopilgan haftalik: yagona ishtirokchi, 1-o'rin
    const wid = await f.weekly(qids, -2 * DAY, -1000);
    await f.prisma.weeklyAttempt.create({
      data: { weeklyTestId: wid, userId: s.id, submittedAt: new Date(now.getTime() - DAY), score: 2 },
    });
    // Davomat: keldi + kelmadi; sababli hisobga kirmaydi
    const g = await f.prisma.group.create({ data: { name: "Yutuq guruhi" } });
    groupId = g.id;
    const day = (n: number) => new Date(new Date(now.getTime() - n * DAY).toISOString().slice(0, 10));
    await f.prisma.attendance.createMany({
      data: [
        { groupId, userId: s.id, date: day(1), status: "PRESENT" },
        { groupId, userId: s.id, date: day(2), status: "ABSENT" },
        { groupId, userId: s.id, date: day(3), status: "EXCUSED" },
        { groupId, userId: s.id, date: day(40), status: "ABSENT" },
      ],
    });
    p = await get(s.headers);
    expect(p.weekly).toMatchObject({ title: "1-hafta", place: 1, participants: 1 });
    expect(p.badges.find((b) => b.key === "weekly-top3")?.done).toBe(true);
    expect(p.attendance).toEqual({ present: 1, total: 2 });

    // Boshqa o'quvchi: bo'sh
    const o = await get(other.headers);
    expect(o.streak).toEqual({ current: 0, best: 0, activeToday: false });
    expect(o.answers).toEqual({ checked: 0, correct: 0 });
    expect(o.weekly).toBeNull();
    expect(o.attendance).toBeNull();
    expect(o.badges.every((b) => !b.done)).toBe(true);
  });

  it("ruxsat: ustozga 403, tokensiz 401", async () => {
    expect((await f.call("GET", "/me/progress", f.teacher)).statusCode).toBe(403);
    expect((await f.call("GET", "/me/progress", {})).statusCode).toBe(401);
  });
});
