import type { AdminOfflineTestDetail, AdminOfflineTestRow, OfflinePreview } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const testIds: string[] = [];
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.offlineTest.deleteMany({ where: { id: { in: testIds } } });
  await f.cleanup();
});

const unique = () => [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");

describe("tashqi test importi (T-056, BR-G04)", () => {
  it("CSV: telefon va ism bo'yicha moslaydi, saqlaydi, qolganini qo'lda biriktiradi", async () => {
    const tag = unique();
    const [a, b, c] = [await f.student(), await f.student(), await f.student()];
    const phone = `99893${String(Date.now()).slice(-7)}`;
    await f.prisma.user.update({ where: { id: a.id }, data: { phone } });
    await f.prisma.studentProfile.update({
      where: { userId: b.id },
      data: { fullName: `Gʻulom Import${tag}` },
    });
    const csv = [
      "F.I.O;Telefon;Algebra;Geometriya",
      `Boshqa ism;+${phone};12,5;8`,
      `g'ulom import${tag};;7;`,
      `Notanish Import${tag};;3;4`,
    ].join("\r\n");

    const p = (
      await f.call("POST", "/admin/offline-tests/preview", f.teacher, { csv })
    ).json() as OfflinePreview;
    expect(p.errors).toEqual([]);
    expect(p.rows.map((r) => [r.match?.userId ?? null, r.match?.by ?? null])).toEqual([
      [a.id, "phone"],
      [b.id, "name"],
      [null, null],
    ]);

    const res = await f.call("POST", "/admin/offline-tests", f.teacher, {
      title: "Oktabr offline",
      date: "2026-10-30",
      csv,
    });
    expect(res.statusCode).toBe(201);
    const t = res.json() as AdminOfflineTestDetail;
    testIds.push(t.id);
    expect(t).toMatchObject({
      sections: ["Algebra", "Geometriya"],
      count: 3,
      matched: 2,
      date: "2026-10-30",
    });
    expect(t.rows.map((r) => r.total)).toEqual([20.5, 7, 7]);

    const free = t.rows.find((r) => !r.userId)!;
    const matched = (
      await f.call("PATCH", `/admin/offline-tests/${t.id}/results/${free.id}`, f.teacher, { userId: c.id })
    ).json() as AdminOfflineTestDetail;
    expect(matched.matched).toBe(3);
    // Bir o'quvchi ikki qatorga biriktirilmaydi
    const dup = await f.call("PATCH", `/admin/offline-tests/${t.id}/results/${free.id}`, f.teacher, {
      userId: a.id,
    });
    expect(dup.statusCode).toBe(400);
    const list = (await f.call("GET", "/admin/offline-tests", f.teacher)).json() as AdminOfflineTestRow[];
    expect(list.find((x) => x.id === t.id)).toMatchObject({ matched: 3, count: 3 });

    expect((await f.call("DELETE", `/admin/offline-tests/${t.id}`, f.teacher)).statusCode).toBe(204);
    expect((await f.call("GET", `/admin/offline-tests/${t.id}`, f.teacher)).statusCode).toBe(404);
  });

  it("xatoli CSV saqlanmaydi (400, qator raqami bilan); o'quvchiga 403", async () => {
    const bad = await f.call("POST", "/admin/offline-tests", f.teacher, {
      title: "Xato",
      date: "2026-10-30",
      csv: "Ism;A\nAli;abc",
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().message).toContain("2-qator");
    const s = await f.student();
    expect((await f.call("GET", "/admin/offline-tests", s.headers)).statusCode).toBe(403);
    expect(
      (await f.call("POST", "/admin/offline-tests/preview", s.headers, { csv: "Ism;A\nAli;1" })).statusCode,
    ).toBe(403);
  });
});
