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
});
