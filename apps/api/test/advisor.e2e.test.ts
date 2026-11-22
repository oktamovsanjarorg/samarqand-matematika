import type { Advice } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const courseIds: string[] = [];

beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.lesson.deleteMany({ where: { topic: { courseId: { in: courseIds } } } });
  await f.prisma.topic.deleteMany({ where: { courseId: { in: courseIds } } });
  await f.prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await f.cleanup();
});

describe("Maslahatchi (T-161)", () => {
  /** "N ta mavzuda dars bor, lekin test yo'q": bazada boshqa testlardan qolgan mavzular ham bo'lishi mumkin */
  const bare = async () => {
    const list = (await f.call("GET", "/admin/advisor", f.teacher)).json() as Advice[];
    const a = list.find((x) => x.key === "content:no-test");
    return a ? Number(a.title.split(" ")[0]) : 0;
  };

  it("nashr qilingan darsi bor, savoli yo'q mavzu maslahatga tushadi; tartib: shoshilinch birinchi", async () => {
    const before = await bare();
    const c = (await f.call("POST", "/admin/courses", f.teacher, { title: "Maslahat kursi" })).json() as {
      id: string;
    };
    courseIds.push(c.id);
    const t = (
      await f.call("POST", `/admin/courses/${c.id}/topics`, f.teacher, { title: "Testsiz" })
    ).json() as {
      id: string;
    };
    const l = (
      await f.call("POST", `/admin/topics/${t.id}/lessons`, f.teacher, { title: "Dars", body: "Matn" })
    ).json() as { id: string };
    // Dars hali qoralama: mavzu sanalmaydi
    expect(await bare()).toBe(before);
    expect(
      (await f.call("PATCH", `/admin/lessons/${l.id}`, f.teacher, { isPublished: true })).statusCode,
    ).toBe(200);
    // Kurs hali nashr qilinmagan: o'quvchi ko'rmaydi, maslahat ham yo'q
    expect(await bare()).toBe(before);
    expect(
      (await f.call("PATCH", `/admin/courses/${c.id}`, f.teacher, { isPublished: true })).statusCode,
    ).toBe(200);
    expect(await bare()).toBe(before + 1);

    const res = await f.call("GET", "/admin/advisor", f.teacher);
    expect(res.statusCode).toBe(200);
    const list = res.json() as Advice[];
    const rank = { urgent: 0, important: 1, info: 2 };
    const levels = list.map((a) => rank[a.level]);
    expect(levels).toEqual([...levels].sort((x, y) => x - y));
  });

  it("oxirgi haftalikda qatnashish past: ustozga e'lon havolasi, yordamchiga haftalik ro'yxati", async () => {
    for (let i = 0; i < 4; i++) await f.student();
    await f.weekly(await f.questions(), -2 * f.HOUR, -1000);
    const helper = await f.student(false);
    await f.prisma.user.update({ where: { id: helper.id }, data: { role: "ASSISTANT" } });
    const find = async (h: Record<string, string>) =>
      ((await f.call("GET", "/admin/advisor", h)).json() as Advice[]).find(
        (a) => a.key === "weekly:participation",
      );
    const t = await find(f.teacher);
    expect(t?.title).toMatch(/^«1-hafta» ni faqat 0\/\d+ oʻquvchi topshirgan$/);
    expect(t?.action).toEqual({ label: "Eʼlon yuborish", to: "/broadcast" });
    expect((await find(helper.headers))?.action).toEqual({ label: "Haftalik testlar", to: "/weekly" });
  });

  it("ruxsat: o'quvchiga 403, tokensiz 401, yordamchiga 200", async () => {
    const s = await f.student();
    expect((await f.call("GET", "/admin/advisor", s.headers)).statusCode).toBe(403);
    expect((await f.call("GET", "/admin/advisor", {})).statusCode).toBe(401);
    const h = await f.student(false);
    await f.prisma.user.update({ where: { id: h.id }, data: { role: "ASSISTANT" } });
    expect((await f.call("GET", "/admin/advisor", h.headers)).statusCode).toBe(200);
  });
});
