import type { MySchool } from "@samarqand/shared";
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

const day = (ago: number) => new Date(new Date(Date.now() - ago * 24 * 3600_000).toISOString().slice(0, 10));

describe("o'quvchi profili: guruh, ota-ona, davomat (T-065)", () => {
  it("bo'sh profil: guruh yo'q, ota-ona yo'q, davomat bo'sh", async () => {
    const s = await f.student();
    const res = await f.call("GET", "/me/school", s.headers);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ group: null, parents: { approved: 0, pending: 0 }, attendance: [] });
  });

  it("guruh, jadval va oxirgi 30 kun davomati (yangisi birinchi); faqat o'ziniki", async () => {
    const [s, other] = [await f.student(), await f.student()];
    const g = await f.prisma.group.create({
      data: { name: "Profil guruhi", schedule: "Du, Chor, Ju 15:00" },
    });
    groupIds.push(g.id);
    for (const u of [s, other])
      await f.prisma.studentProfile.update({ where: { userId: u.id }, data: { groupId: g.id } });
    await f.prisma.attendance.createMany({
      data: [
        { groupId: g.id, userId: s.id, date: day(5), status: "LATE" },
        { groupId: g.id, userId: s.id, date: day(2), status: "PRESENT" },
        { groupId: g.id, userId: s.id, date: day(40), status: "ABSENT" },
        { groupId: g.id, userId: other.id, date: day(1), status: "ABSENT" },
      ],
    });
    const body = (await f.call("GET", "/me/school", s.headers)).json() as MySchool;
    expect(body.group).toEqual({ name: "Profil guruhi", schedule: "Du, Chor, Ju 15:00" });
    expect(body.attendance).toEqual([
      { date: day(2).toISOString().slice(0, 10), status: "PRESENT" },
      { date: day(5).toISOString().slice(0, 10), status: "LATE" },
    ]);
  });

  it("xodimga 403", async () => {
    expect((await f.call("GET", "/me/school", f.teacher)).statusCode).toBe(403);
  });
});
