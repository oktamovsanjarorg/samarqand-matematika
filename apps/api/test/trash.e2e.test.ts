import type { TrashRow } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const courseIds: string[] = [];
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  const where = { topic: { courseId: { in: courseIds } } };
  await f.prisma.question.deleteMany({ where });
  await f.prisma.lesson.deleteMany({ where });
  await f.prisma.topic.deleteMany({ where: { courseId: { in: courseIds } } });
  await f.prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await f.cleanup();
});

const post = async <T>(url: string, body: object) => (await f.call("POST", url, f.teacher, body)).json() as T;
const del = async (url: string) => (await f.call("DELETE", url, f.teacher)).statusCode;
const trash = async () => (await f.call("GET", "/admin/trash", f.teacher)).json() as TrashRow[];
const restore = (id: string | undefined, headers = f.teacher) =>
  f.call("POST", `/admin/trash/${id}/restore`, headers);

describe("axlat qutisi (T-099, FR-U05)", () => {
  it("BR-C06: o'chirilgan kurs, mavzu, dars va savol tiklanadi; ota avval tiklanishi kerak", async () => {
    const stamp = Date.now();
    const c = await post<{ id: string }>("/admin/courses", { title: `Axlat kursi ${stamp}` });
    courseIds.push(c.id);
    const t = await post<{ id: string }>(`/admin/courses/${c.id}/topics`, {
      title: `Axlat mavzusi ${stamp}`,
    });
    const l = await post<{ id: string }>(`/admin/topics/${t.id}/lessons`, { title: `Axlat darsi ${stamp}` });
    expect(
      (await f.call("PATCH", `/admin/lessons/${l.id}`, f.teacher, { body: "Uzun konspekt $x^2$" }))
        .statusCode,
    ).toBe(200);
    const q = await post<{ id: string }>(`/admin/topics/${t.id}/questions`, {
      type: "WRITTEN",
      text: `Isbotlang ${stamp}`,
    });

    expect(await del(`/admin/questions/${q.id}`)).toBe(204);
    const [qRow] = (await trash()).filter((r) => r.title === `Isbotlang ${stamp}`);
    expect(qRow).toMatchObject({
      entity: "Question",
      place: `Axlat kursi ${stamp} · Axlat mavzusi ${stamp}`,
    });
    expect(new Date(qRow?.expiresAt ?? 0).getTime() - new Date(qRow?.deletedAt ?? 0).getTime()).toBe(
      30 * 86_400_000,
    );
    expect(await del(`/admin/lessons/${l.id}`)).toBe(204);
    expect(await del(`/admin/topics/${t.id}`)).toBe(204);
    expect(await del(`/admin/courses/${c.id}`)).toBe(204);

    const mine = (await trash()).filter((r) => r.title.endsWith(String(stamp)));
    expect(mine.map((r) => r.entity)).toEqual(["Course", "Topic", "Lesson", "Question"]);
    const byEntity = (e: string) => mine.find((r) => r.entity === e);
    expect(byEntity("Topic")?.place).toBeNull();

    const early = await restore(byEntity("Lesson")?.id);
    expect(early.statusCode).toBe(409);
    expect(early.json().message).toBe(`Avval mavzuni tiklang: «Axlat mavzusi ${stamp}»`);

    for (const e of ["Course", "Topic", "Lesson", "Question"]) {
      expect((await restore(byEntity(e)?.id)).statusCode).toBe(200);
    }
    expect(await f.prisma.lesson.findUnique({ where: { id: l.id }, select: { body: true } })).toEqual({
      body: "Uzun konspekt $x^2$",
    });
    expect(
      await f.prisma.question.findUnique({ where: { id: q.id }, select: { answer: true, topicId: true } }),
    ).toEqual({ answer: null, topicId: t.id });
    expect((await trash()).some((r) => mine.some((m) => m.id === r.id))).toBe(false);
    expect((await restore(byEntity("Course")?.id)).statusCode).toBe(404);
    // Tiklash jurnalda kontent bo'limida, nomi bilan
    const audit = (await f.call("GET", "/admin/audit?section=content", f.teacher)).json() as {
      rows: { action: string; entityId: string | null; target: string | null }[];
    };
    expect(audit.rows.find((r) => r.action === "trash.restore" && r.entityId === l.id)?.target).toBe(
      `Axlat darsi ${stamp}`,
    );
  });

  it("BR-C06: 30 kundan eski yozuv ro'yxat ochilganda butunlay o'chadi", async () => {
    const old = await f.prisma.trashItem.create({
      data: {
        entity: "Course",
        entityId: "eski",
        title: "Eski kurs",
        data: {},
        deletedAt: new Date(Date.now() - 31 * 86_400_000),
      },
    });
    await trash();
    expect(await f.prisma.trashItem.count({ where: { id: old.id } })).toBe(0);
  });

  it("ruxsat yo'q: o'quvchi 403, tokensiz 401", async () => {
    const s = await f.student();
    expect((await f.call("GET", "/admin/trash", s.headers)).statusCode).toBe(403);
    expect((await restore("x", s.headers)).statusCode).toBe(403);
    expect((await f.call("GET", "/admin/trash", {})).statusCode).toBe(401);
  });
});
