import type { AdminLessonDetail, LessonAnnounceResult } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const courses: string[] = [];
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.lesson.deleteMany({ where: { topic: { courseId: { in: courses } } } });
  await f.prisma.topic.deleteMany({ where: { courseId: { in: courses } } });
  await f.prisma.course.deleteMany({ where: { id: { in: courses } } });
  await f.cleanup();
});

async function lesson(isFree: boolean, title = `Dars ${Date.now()}`) {
  const c = (
    await f.call("POST", "/admin/courses", f.teacher, {
      title: `Eʼlon kursi ${Date.now()}`,
      isPublished: true,
    })
  ).json() as { id: string };
  courses.push(c.id);
  const t = (
    await f.call("POST", `/admin/courses/${c.id}/topics`, f.teacher, { title: "Kasrlar" })
  ).json() as { id: string };
  return (
    await f.call("POST", `/admin/topics/${t.id}/lessons`, f.teacher, { title, isFree })
  ).json() as AdminLessonDetail;
}
const announce = (id: string, headers = f.teacher) =>
  f.call("POST", `/admin/lessons/${id}/announce`, headers);

describe("Yangi dars haqida xabar (T-091)", () => {
  it("BR-C05: nashrdan oldin 409; pullik dars faqat to'liq kirishli o'quvchiga, bir marta", async () => {
    const l = await lesson(false, "Kasrlarni qoʻshish");
    const [full, locked] = [await f.student(true), await f.student(false)];
    expect((await announce(l.id)).statusCode).toBe(409);

    await f.call("PATCH", `/admin/lessons/${l.id}`, f.teacher, { isPublished: true });
    const r = await announce(l.id);
    expect(r.statusCode).toBe(200);
    expect((r.json() as LessonAnnounceResult).sent).toBeGreaterThanOrEqual(1);
    expect(f.messagesTo(full.telegramId)).toEqual([
      expect.stringContaining("Yangi dars: <b>Kasrlarni qoʻshish</b>"),
    ]);
    expect(f.messagesTo(locked.telegramId)).toEqual([]);

    expect((await announce(l.id)).statusCode).toBe(409);
    const detail = (await f.call("GET", `/admin/lessons/${l.id}`, f.teacher)).json() as AdminLessonDetail;
    expect(detail.announcedAt).not.toBeNull();
    const log = await f.prisma.auditLog.findFirst({ where: { action: "lesson.announce", entityId: l.id } });
    expect(log).not.toBeNull();
  });

  it("BR-C02: bepul dars yopilmagan barcha o'quvchilarga; CLOSED ga emas", async () => {
    const l = await lesson(true);
    await f.call("PATCH", `/admin/lessons/${l.id}`, f.teacher, { isPublished: true });
    const open = await f.student(false);
    const closed = await f.student(false);
    await f.prisma.studentProfile.upsert({
      where: { userId: closed.id },
      update: { accessMode: "CLOSED" },
      create: { userId: closed.id, accessMode: "CLOSED" },
    });
    expect((await announce(l.id)).statusCode).toBe(200);
    expect(f.messagesTo(open.telegramId)).toEqual([expect.stringContaining("Bepul")]);
    expect(f.messagesTo(closed.telegramId)).toEqual([]);
  });

  it("o'quvchi xabar yubora olmaydi (403)", async () => {
    const l = await lesson(false);
    const s = await f.student();
    expect((await announce(l.id, s.headers)).statusCode).toBe(403);
    expect((await announce("yoq")).statusCode).toBe(404);
  });
});
