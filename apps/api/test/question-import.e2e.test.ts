import type { QuestionImportResult } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
let topicId: string;
beforeAll(async () => {
  f = await weeklyFixture();
  const [q] = await f.questions();
  topicId = (await f.prisma.question.findUniqueOrThrow({ where: { id: q ?? "" }, select: { topicId: true } }))
    .topicId;
});
afterAll(async () => {
  await f.cleanup();
});

const head = "Tur;Savol;A;B;Javob;Yechim";
const send = (csv: string, dryRun: boolean, headers: Record<string, string> = f.teacher, id = topicId) =>
  f.call("POST", `/admin/topics/${id}/questions/import`, headers, { csv, dryRun });

describe("Excel'dan savol import (T-100)", () => {
  it("BR-Q04: avval tekshiradi, keyin qoralama sifatida mavzu oxiriga qo'shadi; jurnalga yoziladi", async () => {
    const stamp = Date.now();
    const csv = `${head}\nbitta;Import ${stamp} birinchi;1;2;b;Chunki 2\n;Import ${stamp} ikkinchi;;;3/4;\n`;
    const before = await f.prisma.question.count({ where: { topicId } });

    const preview = (await send(csv, true)).json() as QuestionImportResult;
    expect(preview).toEqual({
      ready: [
        { line: 2, type: "SINGLE", text: `Import ${stamp} birinchi` },
        { line: 3, type: "NUMERIC", text: `Import ${stamp} ikkinchi` },
      ],
      errors: [],
      created: 0,
    });
    expect(await f.prisma.question.count({ where: { topicId } })).toBe(before);

    const res = await send(csv, false);
    expect(res.statusCode).toBe(200);
    expect((res.json() as QuestionImportResult).created).toBe(2);
    const added = await f.prisma.question.findMany({
      where: { topicId, text: { startsWith: `Import ${stamp}` } },
      orderBy: { order: "asc" },
      select: { order: true, isPublished: true, type: true, solution: true },
    });
    expect(added).toEqual([
      { order: before, isPublished: false, type: "SINGLE", solution: "Chunki 2" },
      { order: before + 1, isPublished: false, type: "NUMERIC", solution: "" },
    ]);
    const audit = await f.prisma.auditLog.findFirst({
      where: { action: "question.import", entityId: topicId },
      orderBy: { createdAt: "desc" },
    });
    expect(audit?.data).toEqual({ count: 2 });
  });

  it("BR-Q04: bitta qator xato bo'lsa hech narsa saqlanmaydi; o'qilmaydigan ifoda va son qator raqami bilan", async () => {
    const stamp = Date.now();
    const csv = `${head}\nifoda;Xato ${stamp} a;;;2x+*;\nson;Xato ${stamp} b;;;besh;\n;Xato ${stamp} c;;;7;\n`;
    const r = (await send(csv, false)).json() as QuestionImportResult;
    expect(r.created).toBe(0);
    expect(r.ready.map((x) => x.line)).toEqual([4]);
    expect(r.errors).toEqual([
      { line: 2, message: "Javob: ifoda sifatida oʻqilmadi" },
      { line: 3, message: "Javob: son sifatida oʻqilmadi" },
    ]);
    expect(await f.prisma.question.count({ where: { text: { startsWith: `Xato ${stamp}` } } })).toBe(0);
  });

  it("bo'sh fayl 400, mavzu yo'q 404; o'quvchiga 403, tokensiz 401", async () => {
    expect((await send("", true)).statusCode).toBe(400);
    expect((await send(`${head}\n;x;;;1;`, true, f.teacher, "yoq")).statusCode).toBe(404);
    const s = await f.student();
    expect((await send(`${head}\n;x;;;1;`, true, s.headers)).statusCode).toBe(403);
    expect((await send(`${head}\n;x;;;1;`, true, {})).statusCode).toBe(401);
  });
});
