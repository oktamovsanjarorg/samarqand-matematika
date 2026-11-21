import type { AdminStudentCard } from "@samarqand/shared";
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

describe("admin o'quvchi kartasi (T-068)", () => {
  it("bitta javobda: o'quvchi, kirish, e'tibor sababi, guruh, statistika", async () => {
    const s = await f.student(true);
    const g = await f.prisma.group.create({ data: { name: "Karta guruhi" } });
    groupIds.push(g.id);
    await f.prisma.studentProfile.update({
      where: { userId: s.id },
      data: { acceptedAt: new Date(), fullName: "Karta Egasi", groupId: g.id },
    });
    await f.prisma.user.update({
      where: { id: s.id },
      data: { lastSeenAt: new Date(Date.now() - 8 * 24 * 3600_000) },
    });

    const res = await f.call("GET", `/admin/students/${s.id}`, f.teacher);
    expect(res.statusCode).toBe(200);
    const card = res.json() as AdminStudentCard;
    expect(card.student).toMatchObject({
      id: s.id,
      fullName: "Karta Egasi",
      groupName: "Karta guruhi",
      accessMode: "FREE",
    });
    expect(card.access).toMatchObject({ full: true, accepted: true, mode: "FREE" });
    expect(card.reasons).toContainEqual({ code: "INACTIVE", text: "8 kundan beri ilovaga kirmagan" });
    expect(card.school.group).toEqual({ name: "Karta guruhi", schedule: null });
    expect(card.stats).toMatchObject({ tests: 0, averagePercent: null });
    expect(card.weak).toEqual([]);
    expect(card.offline).toEqual([]);
  });

  it("o'quvchi bo'lmagan id 404; o'quvchiga 403", async () => {
    const teacher = await f.prisma.user.findFirstOrThrow({
      where: { role: "TEACHER" },
      select: { id: true },
    });
    expect((await f.call("GET", `/admin/students/${teacher.id}`, f.teacher)).statusCode).toBe(404);
    const s = await f.student();
    expect((await f.call("GET", `/admin/students/${s.id}`, s.headers)).statusCode).toBe(403);
  });
});
