import type { LandingInfo } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_BOT_USERNAME } from "./helpers";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(() => f.cleanup());

const get = async () => {
  const res = await f.call("GET", "/public/landing", {});
  expect(res.statusCode).toBe(200);
  return res.json() as LandingInfo;
};

describe("Landing (T-166)", () => {
  it("tokensiz ochiq; faqat bot havolasi va nashr qilingan kontent soni", async () => {
    const before = await get();
    expect(before.botLink).toBe(`https://t.me/${TEST_BOT_USERNAME}`);
    expect(Object.keys(before).sort()).toEqual(["botLink", "content"]);
    // Nashr qilinmagan kursdagi savollar sanalmaydi
    const qids = await f.questions();
    const q = await f.prisma.question.findUniqueOrThrow({
      where: { id: qids[0] },
      select: { topic: { select: { courseId: true } } },
    });
    await f.prisma.question.updateMany({ where: { id: { in: qids } }, data: { isPublished: true } });
    expect((await get()).content.questions).toBe(before.content.questions);
    await f.prisma.course.update({ where: { id: q.topic.courseId }, data: { isPublished: true } });
    expect((await get()).content.questions).toBe(before.content.questions + 2);
  });
});
