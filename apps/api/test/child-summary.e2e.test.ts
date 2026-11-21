import type { ChildSummary } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(() => f.cleanup());

async function parentOf(child: { id: string }, status: "APPROVED" | "PENDING") {
  const p = await f.student(false);
  await f.prisma.user.update({ where: { id: p.id }, data: { role: "PARENT" } });
  const profile = await f.prisma.studentProfile.findUniqueOrThrow({
    where: { userId: child.id },
    select: { id: true },
  });
  await f.prisma.parentLink.create({
    data: { parentId: p.id, studentId: profile.id, status, phone: "998900000000" },
  });
  return { ...p, studentId: profile.id };
}

describe("ota-ona kabineti (T-069, BR-PA01)", () => {
  it("tasdiqlangan ota-ona: yopilgan haftalik natijasi, ochig'i yo'q; topshirmagan 0", async () => {
    const q = await f.questions();
    const closed = await f.weekly(q);
    const open = await f.weekly(q);
    const child = await f.student();
    // Ro'yxatdan oldin yopilgan haftaliklar ko'rsatilmaydi: bola kechadan beri bor
    await f.prisma.user.update({
      where: { id: child.id },
      data: { createdAt: new Date(Date.now() - 24 * 3600_000) },
    });
    const p = await parentOf(child, "APPROVED");
    await f.prisma.weeklyAttempt.create({
      data: { weeklyTestId: closed, userId: child.id, submittedAt: new Date(), correct: 1 },
    });
    await f.prisma.weeklyTest.update({
      where: { id: closed },
      data: { opensAt: new Date(Date.now() - 3600_000), closesAt: new Date(Date.now() - 60_000) },
    });
    const res = await f.call("GET", `/me/children/${p.studentId}`, p.headers);
    expect(res.statusCode).toBe(200);
    const s = res.json() as ChildSummary;
    const ids = s.weekly.map((w) => w.id);
    expect(ids).toContain(closed);
    expect(ids).not.toContain(open);
    expect(s.weekly.find((w) => w.id === closed)).toMatchObject({ submitted: true, score: 1, total: 2 });
    expect(JSON.stringify(s)).not.toMatch(/suspic|signal|aiVerdict/i);
  });

  it("tasdiqlanmagan yoki boshqa farzand 404; o'quvchiga 403", async () => {
    const child = await f.student();
    const pending = await parentOf(child, "PENDING");
    expect((await f.call("GET", `/me/children/${pending.studentId}`, pending.headers)).statusCode).toBe(404);
    const other = await parentOf(await f.student(), "APPROVED");
    expect((await f.call("GET", `/me/children/${pending.studentId}`, other.headers)).statusCode).toBe(404);
    expect((await f.call("GET", `/me/children/${pending.studentId}`, child.headers)).statusCode).toBe(403);
  });
});
