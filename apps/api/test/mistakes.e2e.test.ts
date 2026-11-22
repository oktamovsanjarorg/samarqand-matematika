import type { AttemptView, Mistake, MyStats } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.cleanup();
});

describe("xatolarim (T-079)", () => {
  it("oxirgi javobi xato savol to'g'ri javob va yechim bilan chiqadi, keyin to'g'ri ishlansa chiqib ketadi", async () => {
    const [single, numeric] = await f.questions();
    await f.prisma.question.updateMany({
      where: { id: { in: [single ?? "", numeric ?? ""] } },
      data: { isPublished: true },
    });
    const { topicId } = await f.prisma.question.findUniqueOrThrow({
      where: { id: numeric ?? "" },
      select: { topicId: true },
    });
    await f.prisma.course.updateMany({
      where: { topics: { some: { id: topicId } } },
      data: { isPublished: true },
    });
    const s = await f.student();
    const attempt = async (value: string) => {
      const { id } = (await f.call("POST", `/topics/${topicId}/attempts`, s.headers)).json() as {
        id: string;
      };
      await f.call("PUT", `/attempts/${id}/answers/${single}`, s.headers, { response: { optionId: "b" } });
      await f.call("PUT", `/attempts/${id}/answers/${numeric}`, s.headers, { response: { value } });
      expect((await f.call("POST", `/attempts/${id}/submit`, s.headers)).statusCode).toBe(200);
    };
    const mistakes = async () => (await f.call("GET", "/me/mistakes", s.headers)).json() as Mistake[];

    await attempt("1/2");
    await attempt("0,5");
    const list = await mistakes();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ topicId, topicTitle: "Aralash", times: 2 });
    expect(list[0]?.item).toMatchObject({
      result: "WRONG",
      response: { value: "0,5" },
      answer: { value: "3/4" },
    });

    await attempt("0,75");
    expect(await mistakes()).toEqual([]);

    // BR-P03: topshirilmagan (ochiq) urinishdagi xato javob hisobga olinmaydi
    const open = (await f.call("POST", `/topics/${topicId}/attempts`, s.headers)).json() as { id: string };
    await f.call("PUT", `/attempts/${open.id}/answers/${numeric}`, s.headers, { response: { value: "9" } });
    expect(await mistakes()).toEqual([]);
  });

  it("T-104: faqat xato savollar bilan qayta ishlash; statistikaga kirmaydi, to'g'ri ishlansa ro'yxatdan chiqadi", async () => {
    const [single, numeric] = await f.questions();
    await f.prisma.question.updateMany({
      where: { id: { in: [single ?? "", numeric ?? ""] } },
      data: { isPublished: true },
    });
    const { topicId } = await f.prisma.question.findUniqueOrThrow({
      where: { id: numeric ?? "" },
      select: { topicId: true },
    });
    await f.prisma.course.updateMany({
      where: { topics: { some: { id: topicId } } },
      data: { isPublished: true },
    });
    const s = await f.student();
    const start = async (body: object) => f.call("POST", `/topics/${topicId}/attempts`, s.headers, body);

    // Hali xato yo'q: 404
    expect((await start({ mistakes: true })).statusCode).toBe(404);
    const full = (await start({})).json() as AttemptView;
    expect(full.mistakesOnly).toBe(false);
    await f.call("PUT", `/attempts/${full.id}/answers/${single}`, s.headers, { response: { optionId: "b" } });
    await f.call("PUT", `/attempts/${full.id}/answers/${numeric}`, s.headers, { response: { value: "1" } });
    await f.call("POST", `/attempts/${full.id}/submit`, s.headers);
    const before = (await f.call("GET", "/me/stats", s.headers)).json() as MyStats;

    const retry = (await start({ mistakes: true })).json() as AttemptView;
    expect(retry.mistakesOnly).toBe(true);
    expect(retry.questions.map((q) => q.question.id)).toEqual([numeric]);
    const openNow = ((await f.call("GET", "/me/stats", s.headers)).json() as MyStats).open;
    expect(openNow).toMatchObject({ attemptId: retry.id, mistakes: true, total: 1 });
    // Oddiy test boshlansa xatolar urinishi bilan aralashmaydi
    expect(((await start({})).json() as AttemptView).id).not.toBe(retry.id);
    expect(((await start({ mistakes: true })).json() as AttemptView).id).toBe(retry.id);

    await f.call("PUT", `/attempts/${retry.id}/answers/${numeric}`, s.headers, {
      response: { value: "3/4" },
    });
    expect((await f.call("POST", `/attempts/${retry.id}/submit`, s.headers)).statusCode).toBe(200);
    const after = (await f.call("GET", "/me/stats", s.headers)).json() as MyStats;
    expect(after.tests).toBe(before.tests);
    expect(after.averagePercent).toBe(before.averagePercent);
    expect((await f.call("GET", "/me/mistakes", s.headers)).json()).toEqual([]);
  });

  it("ruxsat yo'q: ustoz 403, kirmagan 401", async () => {
    expect((await f.call("GET", "/me/mistakes", f.teacher)).statusCode).toBe(403);
    expect((await f.call("GET", "/me/mistakes", {})).statusCode).toBe(401);
  });
});
