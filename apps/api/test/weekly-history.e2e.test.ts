import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyHistory } from "../src/weekly/weekly-history";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.cleanup();
});

describe("haftalik tarix va o'rin (T-189, BR-W10)", () => {
  it("teng ball bir xil o'rin (1, 1, 3), topshirmaganda o'rin yo'q, xodim reytingga kirmaydi", async () => {
    const id = await f.weekly(await f.questions(), -2 * f.HOUR, -1000);
    const [a, b, c, d, staff] = [
      await f.student(),
      await f.student(),
      await f.student(),
      await f.student(),
      await f.student(),
    ];
    await f.prisma.user.update({ where: { id: staff.id }, data: { role: "ASSISTANT" } });
    const done = new Date(Date.now() - f.HOUR);
    await f.prisma.weeklyAttempt.createMany({
      data: [
        { weeklyTestId: id, userId: a.id, submittedAt: done, correct: 1, score: 3 },
        { weeklyTestId: id, userId: b.id, submittedAt: done, correct: 3, score: null },
        { weeklyTestId: id, userId: c.id, submittedAt: done, correct: 1, score: 1 },
        { weeklyTestId: id, userId: d.id },
        { weeklyTestId: id, userId: staff.id, submittedAt: done, score: 9 },
      ],
    });
    const of = async (userId: string, submittedOnly = false) =>
      (await weeklyHistory(f.prisma, userId, new Date(0), { now: new Date(), take: 50, submittedOnly })).find(
        (r) => r.id === id,
      );
    expect(await of(a.id)).toMatchObject({ submitted: true, score: 3, place: 1, participants: 4, total: 2 });
    expect(await of(b.id)).toMatchObject({ score: 3, place: 1 });
    expect(await of(c.id)).toMatchObject({ score: 1, place: 3 });
    expect(await of(d.id)).toMatchObject({ submitted: false, score: 0, place: null, participants: 4 });
    expect(await of(d.id, true)).toBeUndefined();
    // Urinishi yo'q o'quvchi ham testni ko'radi (0 ball)
    const e = await f.student();
    expect(await of(e.id)).toMatchObject({ submitted: false, score: 0, place: null, participants: 4 });
  });
});
