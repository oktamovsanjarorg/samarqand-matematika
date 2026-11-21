import type { AuditPage } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.cleanup();
});

const page = async (headers: Record<string, string>, query = "") =>
  (await f.call("GET", `/admin/audit${query}`, headers)).json() as AuditPage;

describe("jurnal (T-075)", () => {
  it("ustoz xodimlar amallarini nomi bilan ko'radi; bo'lim va xodim bo'yicha filtr", async () => {
    const title = `Jurnal kursi ${Date.now()}`;
    const course = (await f.call("POST", "/admin/courses", f.teacher, { title })).json() as { id: string };
    const assistant = await f.student();
    await f.prisma.user.update({ where: { id: assistant.id }, data: { role: "ASSISTANT" } });
    const topic = (
      await f.call("POST", `/admin/courses/${course.id}/topics`, assistant.headers, {
        title: "Yordamchi mavzusi",
      })
    ).json() as { id: string };

    const all = await page(f.teacher);
    const created = all.rows.find((r) => r.action === "course.create" && r.entityId === course.id);
    expect(created?.target).toBe(title);
    expect(created?.actor?.role).toBe("TEACHER");
    expect(all.actors.map((a) => a.id)).toContain(assistant.id);

    const mine = await page(f.teacher, `?actorId=${assistant.id}`);
    expect(mine.rows.map((r) => [r.action, r.target])).toEqual([["topic.create", "Yordamchi mavzusi"]]);
    expect((await page(f.teacher, "?section=billing")).rows.some((r) => r.entityId === course.id)).toBe(
      false,
    );
    expect((await page(f.teacher, "?section=content")).rows.some((r) => r.entityId === topic.id)).toBe(true);

    // O'chirilgan obyekt nomsiz qoladi, yozuv saqlanadi
    expect((await f.call("DELETE", `/admin/topics/${topic.id}`, f.teacher)).statusCode).toBe(204);
    expect((await f.call("DELETE", `/admin/courses/${course.id}`, f.teacher)).statusCode).toBe(204);
    const after = await page(f.teacher);
    expect(
      after.rows.find((r) => r.action === "course.delete" && r.entityId === course.id)?.target,
    ).toBeNull();
  });

  it("sahifalash: keyingi sahifa takrorlanmaydi", async () => {
    const first = await page(f.teacher);
    if (!first.next) return;
    const second = await page(f.teacher, `?cursor=${first.next}`);
    const ids = new Set(first.rows.map((r) => r.id));
    expect(second.rows.some((r) => ids.has(r.id))).toBe(false);
  });

  it("ruxsat yo'q: yordamchi va o'quvchi 403, noto'g'ri bo'lim 400", async () => {
    const assistant = await f.student();
    await f.prisma.user.update({ where: { id: assistant.id }, data: { role: "ASSISTANT" } });
    expect((await f.call("GET", "/admin/audit", assistant.headers)).statusCode).toBe(403);
    expect((await f.call("GET", "/admin/audit", (await f.student()).headers)).statusCode).toBe(403);
    expect((await f.call("GET", "/admin/audit?section=yoq", f.teacher)).statusCode).toBe(400);
  });
});
