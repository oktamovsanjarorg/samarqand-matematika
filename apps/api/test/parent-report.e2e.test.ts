import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(() => f.cleanup());

/** Farzandi (o'quvchi) ga bog'langan ota-ona */
async function parentOf(child: { id: string }, status: "APPROVED" | "PENDING" = "APPROVED") {
  const p = await f.student(false);
  await f.prisma.user.update({ where: { id: p.id }, data: { role: "PARENT" } });
  const profile = await f.prisma.studentProfile.findUniqueOrThrow({
    where: { userId: child.id },
    select: { id: true },
  });
  await f.prisma.parentLink.create({
    data: { parentId: p.id, studentId: profile.id, status, phone: "998900000000" },
  });
  return p;
}

describe("Ota-onaga hisobot (T-035b)", () => {
  it("BR-W03, BR-W05: yopilganda tasdiqlangan ota-onaga ball va o'rin; ishlamaganniki — 0; AI izi yo'q", async () => {
    const q = await f.questions();
    const id = await f.weekly(q);
    const a = await f.student();
    const b = await f.student();
    await f.prisma.studentProfile.update({ where: { userId: a.id }, data: { fullName: "Hisobot Anvar" } });
    await f.prisma.studentProfile.update({ where: { userId: b.id }, data: { fullName: "Hisobot Bekzod" } });
    const pa = await parentOf(a);
    const pb = await parentOf(b);
    const pending = await parentOf(a, "PENDING");

    const att = (await f.call("POST", `/weekly/${id}/attempts`, a.headers)).json();
    await f.call("PUT", `/weekly-attempts/${att.id}/answers/${q[0]}`, a.headers, {
      response: { optionId: "b" },
    });
    await f.photo(a.headers, { attemptId: att.id, qid: q[0] ?? "" });
    await f.call("POST", `/weekly-attempts/${att.id}/submit`, a.headers);
    await f.prisma.weeklyTest.update({ where: { id }, data: { closesAt: new Date(Date.now() - 1000) } });
    await f.tick();
    await f.tick();

    const toA = f.messagesTo(pa.telegramId);
    expect(toA).toHaveLength(1);
    expect(toA[0]).toContain("Hisobot Anvar");
    expect(toA[0]).toContain("Ball: <b>1/2</b> · oʻrin: 1/1");
    expect(f.messagesTo(pb.telegramId)).toEqual([
      expect.stringContaining("Hisobot Bekzod</b> haftalik test"),
    ]);
    expect(f.messagesTo(pb.telegramId)[0]).toContain("topshirmadi: 0 ball");
    expect(f.messagesTo(pending.telegramId)).toEqual([]);
    for (const m of [...toA, ...f.messagesTo(pb.telegramId)]) expect(m).not.toMatch(/shubha|AI/i);
  });
});
