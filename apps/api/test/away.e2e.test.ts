import type { AdminMockResults, ReviewQueue } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
let templateId: string;
beforeAll(async () => {
  f = await weeklyFixture();
  templateId = (
    await f.call("POST", "/admin/exam-templates", f.teacher, {
      name: "Chiqish shabloni",
      durationMin: 30,
      scaleMax: 75,
      sections: [{ title: "Hammasi", types: ["SINGLE", "NUMERIC"], count: 2, points: 1 }],
      grades: [{ label: "C", min: 20 }],
    })
  ).json().id;
});
afterAll(async () => {
  await f.prisma.mockTest.deleteMany({ where: { templateId } });
  await f.prisma.examTemplate.deleteMany({ where: { id: templateId } });
  await f.cleanup();
});

const away = (base: string, id: string, headers: Record<string, string>, ms: number) =>
  f.call("POST", `${base}/${id}/away`, headers, { ms });

describe("Testda ilovadan chiqish signali (T-193)", () => {
  it("BR-W05, BR-W11: haftalik: faqat o'z topshirilmagan urinishi; ustoz navbatida chegaradan oshganda, o'quvchiga ko'rinmaydi", async () => {
    const q = await f.questions();
    const id = await f.weekly(q);
    const [a, b] = [await f.student(), await f.student()];
    const ua = (await f.call("POST", `/weekly/${id}/attempts`, a.headers)).json();
    const ub = (await f.call("POST", `/weekly/${id}/attempts`, b.headers)).json();
    for (let i = 0; i < 6; i++)
      expect((await away("/weekly-attempts", ua.id, a.headers, 5000)).statusCode).toBe(204);
    await away("/weekly-attempts", ub.id, b.headers, 30_000);
    // Begona urinish va noto'g'ri qiymat
    await away("/weekly-attempts", ua.id, b.headers, 60_000);
    expect((await away("/weekly-attempts", ua.id, a.headers, -1)).statusCode).toBe(400);
    expect((await away("/weekly-attempts", ua.id, a.headers, 31 * 60_000)).statusCode).toBe(400);
    for (const s of [a, b]) {
      const att = s === a ? ua : ub;
      await f.call("PUT", `/weekly-attempts/${att.id}/answers/${q[0]}`, s.headers, {
        response: { optionId: "b" },
      });
      await f.call("POST", `/weekly-attempts/${att.id}/submit`, s.headers);
    }
    // Topshirilgandan keyin yozilmaydi
    await away("/weekly-attempts", ua.id, a.headers, 60_000);
    expect(await f.prisma.weeklyAttempt.findUnique({ where: { id: ua.id } })).toMatchObject({
      awayCount: 6,
      awayMs: 30_000,
    });

    const queue = (await f.call("GET", `/admin/weekly/${id}/review`, f.teacher)).json() as ReviewQueue;
    const of = (userId: string) => queue.items.find((i) => i.student.userId === userId)?.signals.away;
    expect(of(a.id)).toEqual({ count: 6, ms: 30_000 });
    expect(of(b.id)).toBeNull();
    expect(queue.items[0]?.student.userId).toBe(a.id);
    // O'quvchi o'z urinishida signalni ko'rmaydi
    const own = await f.call("GET", `/weekly-attempts/${ua.id}`, a.headers);
    expect(own.body).not.toMatch(/away/i);
  });

  it("BR-W11: mock: ustoz natijalarida 2 daqiqadan ko'p tashqarida bo'lgan o'quvchi belgilanadi; ota-onaga 403", async () => {
    const [single = "", numeric = ""] = await f.questions();
    const m = (
      await f.call("POST", "/admin/mocks", f.teacher, {
        title: "Chiqish mock",
        templateId,
        opensAt: f.at(-f.HOUR),
        closesAt: f.at(48 * f.HOUR),
        sections: [[single, numeric]],
        isPublished: true,
      })
    ).json();
    const s = await f.student();
    const att = (await f.call("POST", `/mocks/${m.id}/attempts`, s.headers)).json();
    await away("/mock-attempts", att.id, s.headers, 90_000);
    await away("/mock-attempts", att.id, s.headers, 60_000);
    const results = (
      await f.call("GET", `/admin/mocks/${m.id}/results`, f.teacher)
    ).json() as AdminMockResults;
    expect(results.rows.find((r) => r.userId === s.id)?.away).toEqual({ count: 2, ms: 150_000 });

    const parent = await f.student(false);
    await f.prisma.user.update({ where: { id: parent.id }, data: { role: "PARENT" } });
    expect((await away("/mock-attempts", att.id, parent.headers, 1000)).statusCode).toBe(403);
    expect((await away("/weekly-attempts", att.id, parent.headers, 1000)).statusCode).toBe(403);
  });
});
