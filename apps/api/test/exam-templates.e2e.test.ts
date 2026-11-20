import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { MILLIY_PRESET, type ExamTemplate } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, loginAs } from "./helpers";

const prisma = new PrismaClient();
let app: NestFastifyApplication;
let teacher: Record<string, string>;
let assistant: Record<string, string>;
let student: Record<string, string>;
const tgIds: bigint[] = [];
const ids: string[] = [];
const NAME = "Sinov shabloni";

type Method = "GET" | "POST" | "PUT" | "PATCH";
const call = (method: Method, url: string, headers: Record<string, string>, payload?: object) =>
  app.inject({ method, url: `/api${url}`, headers, ...(payload ? { payload } : {}) });
const mine = async (h: Record<string, string>) =>
  ((await call("GET", "/admin/exam-templates", h)).json() as ExamTemplate[]).filter((t) =>
    ids.includes(t.id),
  );

beforeAll(async () => {
  app = await createApp();
  const t = await loginAs(app, { owner: true });
  const a = await loginAs(app);
  const s = await loginAs(app);
  await prisma.user.update({ where: { telegramId: a.telegramId }, data: { role: "ASSISTANT" } });
  [teacher, assistant, student] = [t.headers, a.headers, s.headers];
  tgIds.push(t.telegramId, a.telegramId, s.telegramId);
});

afterAll(async () => {
  await prisma.examTemplate.deleteMany({ where: { id: { in: ids } } });
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
  await prisma.$disconnect();
  await app.close();
});

describe("imtihon shabloni (T-050)", () => {
  it("BR-M01: ustoz shablon yaratadi, tahrirlaydi va yashiradi; audit yoziladi", async () => {
    const res = await call("POST", "/admin/exam-templates", teacher, { ...MILLIY_PRESET, name: NAME });
    expect(res.statusCode).toBe(201);
    ids.push(res.json().id);
    expect(await mine(teacher)).toMatchObject([
      { name: NAME, scaleMax: 75, isActive: true, sections: MILLIY_PRESET.sections },
    ]);

    const sections = [{ title: "Yozma", types: ["WRITTEN"], count: 3, points: 5 }];
    const edit = await call("PUT", `/admin/exam-templates/${ids[0]}`, teacher, {
      ...MILLIY_PRESET,
      name: NAME,
      sections,
    });
    expect(edit.statusCode).toBe(200);
    expect(
      (await call("PATCH", `/admin/exam-templates/${ids[0]}`, teacher, { isActive: false })).statusCode,
    ).toBe(200);
    expect(await mine(teacher)).toMatchObject([{ sections, isActive: false }]);
    const logs = await prisma.auditLog.findMany({ where: { entityId: ids[0] }, select: { action: true } });
    expect(logs.map((l) => l.action).sort()).toEqual([
      "exam-template.active",
      "exam-template.create",
      "exam-template.update",
    ]);
  });

  it("noto'g'ri shablon 400: darajalar tartibi, bo'limsiz, takror tur", async () => {
    const bad = [
      {
        ...MILLIY_PRESET,
        grades: [
          { label: "A", min: 50 },
          { label: "B", min: 60 },
        ],
      },
      { ...MILLIY_PRESET, sections: [] },
      { ...MILLIY_PRESET, sections: [{ title: "X", types: ["SINGLE", "SINGLE"], count: 1, points: 1 }] },
    ];
    for (const body of bad)
      expect((await call("POST", "/admin/exam-templates", teacher, body)).statusCode).toBe(400);
    expect((await call("PUT", "/admin/exam-templates/yoq", teacher, MILLIY_PRESET)).statusCode).toBe(404);
  });

  it("shablonni faqat ustoz o'zgartiradi: yordamchi faqat ro'yxatni ko'radi, o'quvchiga 403", async () => {
    expect((await call("GET", "/admin/exam-templates", assistant)).statusCode).toBe(200);
    expect((await call("GET", "/admin/exam-templates", student)).statusCode).toBe(403);
    for (const h of [assistant, student]) {
      expect((await call("POST", "/admin/exam-templates", h, MILLIY_PRESET)).statusCode).toBe(403);
      expect((await call("PATCH", `/admin/exam-templates/${ids[0]}`, h, { isActive: true })).statusCode).toBe(
        403,
      );
    }
  });
});
