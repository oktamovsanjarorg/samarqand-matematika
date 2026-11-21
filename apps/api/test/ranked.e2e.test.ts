import type { Ranking, WeeklyStanding } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.cleanup();
});

describe("Xodim sinovi natijalarga ta'sir qilmaydi (T-087)", () => {
  it("BR-W10: ustoz urinishi reyting, natijalar va ota-ona hisobotida yo'q", async () => {
    const [q1] = await f.questions();
    const id = await f.weekly([q1 ?? ""]);
    const s = await f.student();
    const teacher = await f.prisma.user.findUniqueOrThrow({ where: { telegramId: f.teacherTg } });
    const now = new Date();
    await f.prisma.weeklyAttempt.createMany({
      data: [
        { weeklyTestId: id, userId: s.id, submittedAt: now, correct: 0 },
        { weeklyTestId: id, userId: teacher.id, submittedAt: now, correct: 1 },
      ],
    });

    const standings = (
      await f.call("GET", `/admin/weekly/${id}/standings`, f.teacher)
    ).json() as WeeklyStanding[];
    expect(standings.map((r) => r.userId)).toEqual([s.id]);

    await f.prisma.weeklyTest.update({ where: { id }, data: { closesAt: new Date(now.getTime() - 1000) } });
    await f.tick(new Date());
    const r = (await f.call("GET", `/weekly/${id}/ranking`, s.headers)).json() as Ranking;
    expect(r.participants).toBe(1);
    expect(r.me).toMatchObject({ place: 1 });
    const report = f.messagesTo(f.teacherTg).find((m) => m.includes("yopildi"));
    expect(report).toContain("Topshirdi: <b>1</b>");
  });
});
