import type { AttentionRow } from "@samarqand/shared";
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

const DAY = 24 * 3600_000;
const day = (ago: number) =>
  new Date(new Date(Date.now() - ago * DAY).toISOString().slice(0, 10) + "T00:00:00Z");

describe("ustozga e'tibor kerak ro'yxati (T-063, BR-R02)", () => {
  it("faolsiz va dars qoldirgan qabul qilingan o'quvchi sababi bilan; qabul qilinmagan ro'yxatda yo'q", async () => {
    const [idle, fresh, unaccepted] = [await f.student(), await f.student(), await f.student()];
    for (const s of [idle, fresh])
      await f.prisma.studentProfile.update({
        where: { userId: s.id },
        data: { acceptedAt: new Date(), fullName: "Diqqat Talab" },
      });
    await f.prisma.user.update({
      where: { id: idle.id },
      data: { lastSeenAt: new Date(Date.now() - 10 * DAY) },
    });
    await f.prisma.user.update({
      where: { id: unaccepted.id },
      data: { lastSeenAt: new Date(Date.now() - 30 * DAY) },
    });
    const g = await f.prisma.group.create({ data: { name: "Diqqat guruhi" }, select: { id: true } });
    groupIds.push(g.id);
    await f.prisma.studentProfile.update({ where: { userId: idle.id }, data: { groupId: g.id } });
    for (const ago of [2, 5])
      await f.prisma.attendance.create({
        data: { groupId: g.id, userId: idle.id, date: day(ago), status: "ABSENT" },
      });

    const res = await f.call("GET", "/admin/attention", f.teacher);
    expect(res.statusCode).toBe(200);
    const rows = res.json() as AttentionRow[];
    const row = rows.find((r) => r.userId === idle.id);
    expect(row).toMatchObject({ name: "Diqqat Talab", groupName: "Diqqat guruhi" });
    expect(row?.reasons).toEqual(
      expect.arrayContaining([
        { code: "INACTIVE", text: "10 kundan beri ilovaga kirmagan" },
        { code: "ABSENT", text: "Oxirgi 14 kunda 2 marta darsga kelmagan" },
      ]),
    );
    const codes = rows.find((r) => r.userId === fresh.id)?.reasons.map((r) => r.code) ?? [];
    expect(codes).not.toContain("INACTIVE");
    expect(rows.find((r) => r.userId === unaccepted.id)).toBeUndefined();
  });

  it("o'quvchiga 403", async () => {
    const s = await f.student();
    expect((await f.call("GET", "/admin/attention", s.headers)).statusCode).toBe(403);
  });
});
