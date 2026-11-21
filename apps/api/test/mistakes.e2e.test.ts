import type { Mistake } from "@samarqand/shared";
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

  it("ruxsat yo'q: ustoz 403, kirmagan 401", async () => {
    expect((await f.call("GET", "/me/mistakes", f.teacher)).statusCode).toBe(403);
    expect((await f.call("GET", "/me/mistakes", {})).statusCode).toBe(401);
  });
});
