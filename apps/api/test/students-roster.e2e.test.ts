import type { AdminStudentRow } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const groupIds: string[] = [];
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.group.deleteMany({ where: { id: { in: groupIds } } });
  await f.cleanup();
});

async function group(name: string) {
  const g = (await f.call("POST", "/admin/groups", f.teacher, { name })).json() as { id: string };
  groupIds.push(g.id);
  return g.id;
}
const list = async (qs: string) =>
  (await f.call("GET", `/admin/students?${qs}`, f.teacher)).json() as AdminStudentRow[];

describe("o'quvchilar ro'yxati (T-185, BR-S03)", () => {
  it("guruh bilan qabul qilish, guruh va online filtri, 30 kunlik davomat", async () => {
    const g = await group(`Roster guruh ${Date.now()}`);
    const a = await f.student(false);
    const b = await f.student(false);
    expect((await list("filter=new")).map((r) => r.id)).toEqual(expect.arrayContaining([a.id, b.id]));

    const ra = (await f.call("POST", `/admin/students/${a.id}/accept`, f.teacher, { groupId: g })).json();
    expect(ra).toMatchObject({ groupId: g, blocked: false, parentsPending: 0 });
    const rb = (await f.call("POST", `/admin/students/${b.id}/accept`, f.teacher, { groupId: null })).json();
    expect((rb as AdminStudentRow).groupId).toBeNull();
    expect((await list("filter=new")).map((r) => r.id)).not.toContain(a.id);

    expect((await list(`group=${g}`)).map((r) => r.id)).toEqual([a.id]);
    const online = (await list("group=none&filter=all")).map((r) => r.id);
    expect(online).toContain(b.id);
    expect(online).not.toContain(a.id);

    const today = new Date().toISOString().slice(0, 10);
    await f.call("PUT", `/admin/groups/${g}/attendance`, f.teacher, {
      date: today,
      marks: [{ userId: a.id, status: "LATE" }],
    });
    expect((await list(`group=${g}`))[0]?.attendance30).toEqual({ present: 1, absent: 0, total: 1 });
    // Yo'q guruhga qabul qilib bo'lmaydi
    const c = await f.student(false);
    expect(
      (await f.call("POST", `/admin/students/${c.id}/accept`, f.teacher, { groupId: "yoq" })).statusCode,
    ).toBe(404);
  });

  it("bloklash sabab bilan, ilovaga kira olmaydi; begona o'chiriladi, qabul qilingan o'chirilmaydi", async () => {
    const s = await f.student(false);
    const r = (
      await f.call("POST", `/admin/students/${s.id}/block`, f.teacher, { blocked: true, reason: "Begona" })
    ).json();
    expect(r).toMatchObject({ blocked: true, blockedReason: "Begona" });
    expect((await f.call("GET", "/me", s.headers)).statusCode).toBe(401);
    const un = (await f.call("POST", `/admin/students/${s.id}/block`, f.teacher, { blocked: false })).json();
    expect(un).toMatchObject({ blocked: false, blockedReason: null });

    expect((await f.call("DELETE", `/admin/students/${s.id}`, f.teacher)).statusCode).toBe(204);
    expect((await f.call("GET", `/admin/students/${s.id}`, f.teacher)).statusCode).toBe(404);
    const accepted = await f.student(false);
    await f.call("POST", `/admin/students/${accepted.id}/accept`, f.teacher, {});
    expect((await f.call("DELETE", `/admin/students/${accepted.id}`, f.teacher)).statusCode).toBe(409);
  });

  it("ruxsat yo'q: yordamchi o'chira olmaydi, o'quvchi bloklay olmaydi", async () => {
    const s = await f.student(false);
    const helper = await f.student(false);
    await f.prisma.user.update({ where: { id: helper.id }, data: { role: "ASSISTANT" } });
    expect((await f.call("DELETE", `/admin/students/${s.id}`, helper.headers)).statusCode).toBe(403);
    expect(
      (await f.call("POST", `/admin/students/${s.id}/block`, s.headers, { blocked: true })).statusCode,
    ).toBe(403);
  });
});
