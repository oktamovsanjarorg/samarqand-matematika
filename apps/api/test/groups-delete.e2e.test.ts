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

async function group() {
  const g = (
    await f.call("POST", "/admin/groups", f.teacher, { name: `Oʻchiriladigan ${Date.now()}` })
  ).json();
  groupIds.push(g.id);
  return g.id as string;
}

describe("guruhni o'chirish (T-188)", () => {
  it("o'quvchilar guruhsiz qoladi, davomat o'chadi, audit'da nom qoladi", async () => {
    const g = await group();
    const s = await f.student();
    await f.call("POST", `/admin/groups/${g}/students`, f.teacher, { userIds: [s.id] });
    await f.call("PUT", `/admin/groups/${g}/attendance`, f.teacher, {
      date: "2026-11-02",
      marks: [{ userId: s.id, status: "PRESENT" }],
    });

    expect((await f.call("DELETE", `/admin/groups/${g}`, f.teacher)).statusCode).toBe(204);
    expect((await f.call("GET", `/admin/groups/${g}`, f.teacher)).statusCode).toBe(404);
    const row = (await f.call("GET", `/admin/students/${s.id}`, f.teacher)).json() as {
      student: AdminStudentRow;
    };
    expect(row.student.groupId).toBeNull();
    expect(await f.prisma.attendance.count({ where: { groupId: g } })).toBe(0);
    const log = await f.prisma.auditLog.findFirst({ where: { action: "group.delete", entityId: g } });
    expect(log?.data).toMatchObject({ students: 1, attendance: 1 });
    expect((await f.call("DELETE", `/admin/groups/${g}`, f.teacher)).statusCode).toBe(404);
  });

  it("ruxsat yo'q: yordamchi va o'quvchi guruhni o'chira olmaydi", async () => {
    const g = await group();
    const helper = await f.student(false);
    await f.prisma.user.update({ where: { id: helper.id }, data: { role: "ASSISTANT" } });
    expect((await f.call("DELETE", `/admin/groups/${g}`, helper.headers)).statusCode).toBe(403);
    const s = await f.student();
    expect((await f.call("DELETE", `/admin/groups/${g}`, s.headers)).statusCode).toBe(403);
    expect((await f.call("GET", `/admin/groups/${g}`, f.teacher)).statusCode).toBe(200);
  });
});
