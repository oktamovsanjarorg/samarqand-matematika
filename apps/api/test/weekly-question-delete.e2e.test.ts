import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.cleanup();
});

describe("Testga qo'shilgan savolni o'chirish (T-095)", () => {
  it("BR-P05: haftalik testdagi savol o'chmaydi: 500 emas, 409 va tushunarli matn", async () => {
    const [q] = await f.questions();
    await f.weekly([q ?? ""], f.HOUR);
    const res = await f.call("DELETE", `/admin/questions/${q}`, f.teacher);
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toContain("testda");
    expect(await f.prisma.question.count({ where: { id: q } })).toBe(1);
  });

  it("BR-P05: mock testdagi savol ham o'chmaydi (409)", async () => {
    const [, q] = await f.questions();
    const now = Date.now();
    await f.prisma.mockTest.create({
      data: {
        title: "Savol o'chirish mocki",
        template: {},
        opensAt: new Date(now + f.HOUR),
        closesAt: new Date(now + 2 * f.HOUR),
        questions: { create: [{ questionId: q ?? "", section: 0, order: 0 }] },
      },
    });
    const res = await f.call("DELETE", `/admin/questions/${q}`, f.teacher);
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toContain("mock");
  });

  it("ruxsat yo'q: o'quvchi savolni o'chira olmaydi (403)", async () => {
    const [q] = await f.questions();
    const s = await f.student();
    expect((await f.call("DELETE", `/admin/questions/${q}`, s.headers)).statusCode).toBe(403);
  });
});
