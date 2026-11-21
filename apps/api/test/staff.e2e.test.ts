import type { StaffRow } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.cleanup();
});

const ids = (rows: StaffRow[]) => rows.map((r) => r.id);

describe("Yordamchilar (T-086)", () => {
  it("BR-A05: ustoz o'quvchini yordamchi qiladi, huquq darhol ishlaydi, qaytarilsa yo'qoladi", async () => {
    const s = await f.student(false);
    expect((await f.call("GET", "/admin/students", s.headers)).statusCode).toBe(403);

    const added = await f.call("POST", "/admin/staff", f.teacher, { userId: s.id });
    expect(added.statusCode).toBe(200);
    expect((added.json() as StaffRow[]).find((r) => r.id === s.id)).toMatchObject({ role: "ASSISTANT" });
    expect((await f.call("GET", "/admin/students", s.headers)).statusCode).toBe(200);
    expect(f.messagesTo(s.telegramId)).toEqual([expect.stringContaining("/admin")]);

    // yordamchi boshqa yordamchi tayinlay olmaydi va ro'yxatni ko'rmaydi
    expect((await f.call("GET", "/admin/staff", s.headers)).statusCode).toBe(403);
    expect((await f.call("POST", "/admin/staff", s.headers, { userId: s.id })).statusCode).toBe(403);
    // ikki marta tayinlab bo'lmaydi
    expect((await f.call("POST", "/admin/staff", f.teacher, { userId: s.id })).statusCode).toBe(409);

    const removed = await f.call("DELETE", `/admin/staff/${s.id}`, f.teacher);
    expect(removed.statusCode).toBe(200);
    expect(ids(removed.json() as StaffRow[])).not.toContain(s.id);
    expect((await f.call("GET", "/admin/students", s.headers)).statusCode).toBe(403);
    expect(f.messagesTo(s.telegramId)[1]).toContain("olib tashlandi");

    const log = await f.prisma.auditLog.findMany({
      where: { entityId: s.id },
      orderBy: { createdAt: "asc" },
    });
    expect(log.map((l) => l.action)).toEqual(["staff.add", "staff.remove"]);
  });

  it("BR-A05: ustozni (egani) va ota-onani bu yerdan o'zgartirib bo'lmaydi; noma'lum foydalanuvchi 404", async () => {
    const list = (await f.call("GET", "/admin/staff", f.teacher)).json() as StaffRow[];
    const owner = list.find((r) => r.role === "TEACHER");
    expect(owner).toBeDefined();
    expect((await f.call("DELETE", `/admin/staff/${owner?.id ?? ""}`, f.teacher)).statusCode).toBe(409);
    expect((await f.call("POST", "/admin/staff", f.teacher, { userId: owner?.id })).statusCode).toBe(409);

    const p = await f.student(false);
    await f.prisma.user.update({ where: { id: p.id }, data: { role: "PARENT" } });
    expect((await f.call("POST", "/admin/staff", f.teacher, { userId: p.id })).statusCode).toBe(409);
    expect((await f.call("POST", "/admin/staff", f.teacher, { userId: "yoq" })).statusCode).toBe(404);
    expect((await f.call("POST", "/admin/staff", f.teacher, {})).statusCode).toBe(400);
  });

  it("tokensiz 401", async () => {
    expect((await f.call("GET", "/admin/staff", {})).statusCode).toBe(401);
  });
});
