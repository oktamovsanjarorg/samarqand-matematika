import type {
  AdminOfflineTestDetail,
  AdminOfflineTestRow,
  OfflinePreview,
  OfflineRankingRow,
  StudentOfflineDetail,
  StudentOfflineResult,
} from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sentMessages } from "./helpers";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const testIds: string[] = [];
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.offlineTest.deleteMany({ where: { id: { in: testIds } } });
  await f.prisma.appSetting.deleteMany({ where: { key: "offline.sections" } });
  await f.cleanup();
});

const unique = () => [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");

/** Skaner eksporti: 4 savol, bo'limlar "1-2" va "3-4" */
function omr(rows: [string, string][]) {
  const head = ["Экзамен", "Имя", "Sertifikat -1-2", "Sertifikat -3-4"];
  for (let q = 1; q <= 4; q++) head.push(`Q ${q} Options`, `Q ${q} Marks`);
  const lines = rows.map(([name, marks]) => {
    const cells = ["Mock 7", name, "", ""];
    for (const m of marks) cells.push(m === "b" ? "" : "A", m === "c" ? "1" : "0");
    return cells.join(",");
  });
  return [head.join(","), ...lines].join("\r\n");
}

async function parentOf(child: { id: string }) {
  const p = await f.student(false);
  await f.prisma.user.update({ where: { id: p.id }, data: { role: "PARENT" } });
  const profile = await f.prisma.studentProfile.findUniqueOrThrow({ where: { userId: child.id } });
  await f.prisma.parentLink.create({
    data: { parentId: p.id, studentId: profile.id, status: "APPROVED", phone: "998900000000" },
  });
  return p;
}

describe("offline test (T-181, BR-G04, BR-M05)", () => {
  it("skaner fayli: moslash, ball va daraja, fan bo'limlari, tahlil, biriktirish", async () => {
    const tag = unique();
    const [a, b, c] = [await f.student(), await f.student(), await f.student()];
    await f.prisma.studentProfile.update({ where: { userId: a.id }, data: { fullName: `Gʻulom A${tag}` } });
    await f.prisma.studentProfile.update({ where: { userId: b.id }, data: { fullName: `Lola B${tag}` } });
    const csv = omr([
      [`g'ulom a${tag}`, "cccc"],
      [`Lola B${tag}`, "cwcb"],
      [`Notanish ${tag}`, "wwbb"],
    ]);

    const p = (
      await f.call("POST", "/admin/offline-tests/preview", f.teacher, { csv })
    ).json() as OfflinePreview;
    expect(p).toMatchObject({
      format: "omr",
      exam: "Mock 7",
      questionCount: 4,
      scaleMax: 75,
      calibrated: false,
    });
    expect(p.fileSections.map((s) => s.questions)).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(p.rows.map((r) => [r.match?.userId ?? null, r.correct])).toEqual([
      [a.id, 4],
      [b.id, 2],
      [null, 0],
    ]);

    const sections = [
      { title: "Algebra", questions: [1, 3] },
      { title: "Geometriya", questions: [2, 4] },
    ];
    const res = await f.call("POST", "/admin/offline-tests", f.teacher, {
      title: `Noyabr offline ${tag}`,
      date: "2026-11-20",
      csv,
      sections,
    });
    expect(res.statusCode).toBe(201);
    const t = res.json() as AdminOfflineTestDetail;
    testIds.push(t.id);
    expect(t).toMatchObject({ count: 3, matched: 2, questionCount: 4, sections, date: "2026-11-20" });
    expect(t.rows.map((r) => [r.rank, r.answers])).toEqual([
      [1, "cccc"],
      [2, "cwcb"],
      [3, "wwbb"],
    ]);
    expect(t.rows[0]!.score).toBeGreaterThan(t.rows[1]!.score);
    expect(t.stats.questions[0]).toMatchObject({ q: 1, correctPct: 66.7 });
    expect(t.stats.sections.map((s) => s.title)).toEqual(["Algebra", "Geometriya"]);
    expect(t.stats.grades.reduce((n, g) => n + g.count, 0)).toBe(3);

    // Fan bo'limlari keyingi importda taklif qilinadi (savol soni mos bo'lsa)
    const again = (await f.call("POST", "/admin/offline-tests/preview", f.teacher, { csv })).json();
    expect((again as OfflinePreview).savedSections).toEqual(sections);

    const free = t.rows.find((r) => !r.userId)!;
    const linked = (
      await f.call("PATCH", `/admin/offline-tests/${t.id}/results/${free.id}`, f.teacher, { userId: c.id })
    ).json() as AdminOfflineTestDetail;
    expect(linked.matched).toBe(3);
    const dup = await f.call("PATCH", `/admin/offline-tests/${t.id}/results/${free.id}`, f.teacher, {
      userId: a.id,
    });
    expect(dup.statusCode).toBe(400);
    const list = (await f.call("GET", "/admin/offline-tests", f.teacher)).json() as AdminOfflineTestRow[];
    expect(list.find((x) => x.id === t.id)).toMatchObject({ matched: 3, count: 3 });

    // Bo'limlarni keyin o'zgartirish: savol testda bo'lmasa 400
    const edit = await f.call("PUT", `/admin/offline-tests/${t.id}/sections`, f.teacher, {
      sections: [{ title: "Hammasi", questions: [1, 2, 3, 4] }],
    });
    expect((edit.json() as AdminOfflineTestDetail).stats.sections).toHaveLength(1);
    const big = await f.call("PUT", `/admin/offline-tests/${t.id}/sections`, f.teacher, {
      sections: [{ title: "X", questions: [5] }],
    });
    expect(big.statusCode).toBe(400);
  });

  it("o'quvchi va ota-ona: natija, fan bo'limlari, har savol; reyting; xabar bir marta", async () => {
    const tag = unique();
    const [a, b] = [await f.student(), await f.student()];
    await f.prisma.studentProfile.update({ where: { userId: a.id }, data: { fullName: `Aziz C${tag}` } });
    await f.prisma.studentProfile.update({ where: { userId: b.id }, data: { fullName: `Botir C${tag}` } });
    const parent = await parentOf(b);
    const csv = `Ism;Q1;Q2;Q3\nAziz C${tag};1;1;1\nBotir C${tag};1;0;\n`;
    const t = (
      await f.call("POST", "/admin/offline-tests", f.teacher, {
        title: `Matritsa ${tag}`,
        date: "2026-11-21",
        csv,
        sections: [{ title: "Algebra", questions: [1, 2] }],
      })
    ).json() as AdminOfflineTestDetail;
    testIds.push(t.id);

    const own = (await f.call("GET", "/me/offline-results", b.headers)).json() as StudentOfflineResult[];
    expect(own).toEqual([
      expect.objectContaining({ title: `Matritsa ${tag}`, correct: 1, place: 2, participants: 2 }),
    ]);
    const d = (
      await f.call("GET", `/me/offline-results/${own[0]!.id}`, b.headers)
    ).json() as StudentOfflineDetail;
    expect(d).toMatchObject({ answers: "cwb", wrong: 1, blank: 1 });
    expect(d.sections[0]).toMatchObject({ title: "Algebra", correct: 1, max: 2, percent: 50 });
    expect(d.points.reduce((s, x) => s + x, 0)).toBeCloseTo(d.score, 1);
    // Ota-ona farzandinikini ko'radi, boshqa o'quvchi va begona ota-ona ko'rmaydi
    expect((await f.call("GET", `/me/offline-results/${d.id}`, parent.headers)).statusCode).toBe(200);
    expect((await f.call("GET", `/me/offline-results/${d.id}`, a.headers)).statusCode).toBe(404);
    const other = await parentOf(a);
    expect((await f.call("GET", `/me/offline-results/${d.id}`, other.headers)).statusCode).toBe(404);

    const rank = (await f.call("GET", "/admin/offline-tests/ranking?days=0", f.teacher)).json();
    const mine = (rank as OfflineRankingRow[]).filter((r) => [a.id, b.id].includes(r.userId));
    expect(mine.map((r) => r.userId)).toEqual([a.id, b.id]);

    const before = sentMessages.length;
    const n = (await f.call("POST", `/admin/offline-tests/${t.id}/notify`, f.teacher)).json();
    expect(n).toEqual({ students: 2, parents: 2 });
    expect(sentMessages.slice(before).some((m) => m.html.includes(`Matritsa ${tag}`))).toBe(true);
    expect((await f.call("POST", `/admin/offline-tests/${t.id}/notify`, f.teacher)).json()).toEqual({
      students: 0,
      parents: 0,
    });
  });

  it("BR-G04: tanilmagan fayl 400 sabab bilan; ruxsat yo'q: o'quvchiga 403, ustozga /me 403", async () => {
    const bad = await f.call("POST", "/admin/offline-tests", f.teacher, {
      title: "Xato",
      date: "2026-10-30",
      csv: "Ism;A\nAli;abc",
      sections: [],
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().message).toContain("Fayl tanilmadi");
    const s = await f.student();
    for (const [m, url] of [
      ["GET", "/admin/offline-tests"],
      ["GET", "/admin/offline-tests/ranking"],
      ["POST", "/admin/offline-tests/x/notify"],
      ["PUT", "/admin/offline-tests/x/sections"],
    ] as const)
      expect((await f.call(m, url, s.headers, { sections: [] })).statusCode).toBe(403);
    expect((await f.call("GET", "/me/offline-results", f.teacher)).statusCode).toBe(403);
    expect((await f.call("GET", "/me/offline-results/x", f.teacher)).statusCode).toBe(403);
  });
});
