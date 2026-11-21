import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MockScheduler } from "../src/mock/mock-scheduler";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const mockIds: string[] = [];
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.mockTest.deleteMany({ where: { id: { in: mockIds } } });
  await f.cleanup();
});

const HOUR = 3_600_000;

describe("test ochilganda xabar (T-080)", () => {
  it("haftalik test: ochilganda to'liq kirishli o'quvchiga bir marta, kirishsizga yo'q", async () => {
    const qids = await f.questions();
    const [open, later] = [await f.weekly(qids), await f.weekly(qids, HOUR)];
    const [t1, t2] = [`Ochiq ${Date.now()}`, `Keyin ${Date.now()}`];
    await f.prisma.weeklyTest.update({ where: { id: open }, data: { title: t1 } });
    await f.prisma.weeklyTest.update({ where: { id: later }, data: { title: t2 } });
    const [full, closed] = [await f.student(), await f.student(false)];
    const about = (tg: bigint, title: string) =>
      f.messagesTo(tg).filter((m) => m.includes("Yangi haftalik test") && m.includes(title));

    await f.tick();
    await f.tick();
    expect(about(full.telegramId, t1)).toHaveLength(1);
    expect(about(full.telegramId, t1)[0]).toMatch(/gacha ishlang/);
    expect(about(full.telegramId, t2)).toEqual([]);
    expect(about(closed.telegramId, t1)).toEqual([]);

    await f.tick(new Date(Date.now() + 2 * HOUR));
    expect(about(full.telegramId, t2)).toHaveLength(1);
  });

  it("mock: ochilganda bir marta xabar", async () => {
    const title = `Mock e'lon ${Date.now()}`;
    const m = await f.prisma.mockTest.create({
      data: {
        title,
        template: {},
        opensAt: new Date(Date.now() - HOUR),
        closesAt: new Date(Date.now() + HOUR),
        isPublished: true,
      },
    });
    mockIds.push(m.id);
    const s = await f.student();
    const scheduler = f.app.get(MockScheduler);
    await scheduler.announce(new Date());
    await scheduler.announce(new Date());
    const got = f.messagesTo(s.telegramId).filter((x) => x.includes(title));
    expect(got).toEqual([expect.stringContaining("Mock imtihon ochildi")]);
  });

  it("T-118: mock yopilishiga 1 kun qolganda topshirmaganga bir marta eslatma; qisqa oynada yo'q", async () => {
    const now = Date.now();
    const mock = async (title: string, openedAgo: number) => {
      const m = await f.prisma.mockTest.create({
        data: {
          title,
          template: {},
          opensAt: new Date(now - openedAgo),
          closesAt: new Date(now + 20 * HOUR),
          isPublished: true,
        },
      });
      mockIds.push(m.id);
      return m.id;
    };
    const [long, short] = [`Uzun ${now}`, `Qisqa ${now}`];
    const id = await mock(long, 13 * HOUR);
    await mock(short, 2 * HOUR);
    const [waiting, done, closed] = [await f.student(), await f.student(), await f.student(false)];
    await f.prisma.mockAttempt.create({
      data: { mockTestId: id, userId: done.id, deadline: new Date(now), submittedAt: new Date(now) },
    });
    const scheduler = f.app.get(MockScheduler);
    await scheduler.remind(new Date(now));
    await scheduler.remind(new Date(now));
    const about = (tg: bigint, title: string) => f.messagesTo(tg).filter((m) => m.includes(title));
    expect(about(waiting.telegramId, long)).toEqual([expect.stringContaining("Hali topshirmadingiz")]);
    expect(about(waiting.telegramId, short)).toEqual([]);
    expect(about(done.telegramId, long)).toEqual([]);
    expect(about(closed.telegramId, long)).toEqual([]);
  });

  it("T-084: haftalik yopilganda ustozga hisobot: topshirganlar, kutilayotgan va shubhali javoblar", async () => {
    const [q1, q2] = await f.questions();
    const id = await f.weekly([q1 ?? "", q2 ?? ""]);
    const title = `Hisobot ${Date.now()}`;
    await f.prisma.weeklyTest.update({ where: { id }, data: { title } });
    const s = await f.student();
    const a = await f.prisma.weeklyAttempt.create({
      data: { weeklyTestId: id, userId: s.id, submittedAt: new Date(), correct: 0 },
    });
    await f.prisma.weeklyAnswer.createMany({
      data: [
        { attemptId: a.id, questionId: q1 ?? "", order: 0, result: "MANUAL" },
        { attemptId: a.id, questionId: q2 ?? "", order: 1, result: "CORRECT" },
      ],
    });
    await f.prisma.aiReview.create({
      data: { attemptId: a.id, questionId: q2 ?? "", status: "DONE", suspected: true },
    });
    await f.tick(new Date(Date.now() + 49 * HOUR));
    const report = f.messagesTo(f.teacherTg).find((m) => m.includes(title));
    expect(report).toContain("yopildi");
    expect(report).toMatch(/Topshirdi: <b>1<\/b> \/ \d+/);
    expect(report).toContain("Ustoz qarorini kutmoqda: <b>2</b> ta javob (shubhali: 1)");
    // BR-W05: o'quvchiga shubha haqida hech narsa bormaydi
    for (const m of f.messagesTo(s.telegramId)) expect(m).not.toMatch(/shubha/i);
  });
});
