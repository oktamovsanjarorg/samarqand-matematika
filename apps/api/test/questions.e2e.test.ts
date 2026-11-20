import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, loginAs } from "./helpers";

const prisma = new PrismaClient();
let app: NestFastifyApplication;
let teacher: Record<string, string>;
let student: Record<string, string>;
const tgIds: bigint[] = [];
const courseIds: string[] = [];

type Method = "GET" | "POST" | "PUT" | "DELETE";
const call = (method: Method, url: string, headers: Record<string, string>, payload?: object) =>
  app.inject({ method, url: `/api${url}`, headers, ...(payload ? { payload } : {}) });

const options = [
  { id: "a", text: "$x=1$" },
  { id: "b", text: "$x=2$" },
];
const single = {
  type: "SINGLE",
  text: "$x+1=3$ bo'lsa?",
  options,
  answer: { optionId: "b" },
  solution: "x=2",
};

async function newTopic() {
  const c = (await call("POST", "/admin/courses", teacher, { title: "Savollar kursi" })).json();
  courseIds.push(c.id);
  return (await call("POST", `/admin/courses/${c.id}/topics`, teacher, { title: "Tenglama" })).json() as {
    id: string;
  };
}
const create = async (topicId: string, body: object = single) =>
  call("POST", `/admin/topics/${topicId}/questions`, teacher, body);

beforeAll(async () => {
  app = await createApp();
  const t = await loginAs(app, { owner: true });
  const s = await loginAs(app);
  teacher = t.headers;
  student = s.headers;
  tgIds.push(t.telegramId, s.telegramId);
});

afterAll(async () => {
  const where = { topic: { courseId: { in: courseIds } } };
  await prisma.question.deleteMany({ where });
  await prisma.topic.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
  await prisma.$disconnect();
  await app.close();
});

describe("Savollar banki: ruxsatlar", () => {
  it("o'quvchi savollar bankiga kira olmaydi (403), tokensiz 401", async () => {
    const t = await newTopic();
    const q = (await create(t.id)).json();
    expect((await call("GET", `/admin/topics/${t.id}/questions`, student)).statusCode).toBe(403);
    expect((await call("GET", `/admin/questions/${q.id}`, student)).statusCode).toBe(403);
    expect((await call("POST", `/admin/topics/${t.id}/questions`, student, single)).statusCode).toBe(403);
    expect((await call("PUT", `/admin/questions/${q.id}`, student, single)).statusCode).toBe(403);
    expect((await call("DELETE", `/admin/questions/${q.id}`, student)).statusCode).toBe(403);
    expect((await call("GET", `/admin/questions/${q.id}`, {})).statusCode).toBe(401);
  });
});

describe("Savollar banki: CRUD", () => {
  it("yaratish, ro'yxat, o'qish, almashtirish, o'chirish", async () => {
    const t = await newTopic();
    const res = await create(t.id);
    expect(res.statusCode).toBe(201);
    const q = res.json();
    expect(q).toMatchObject({ ...single, topicId: t.id, order: 0, difficulty: 2, isPublished: false });

    const list = (await call("GET", `/admin/topics/${t.id}/questions`, teacher)).json();
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("answer");

    const numeric = { type: "NUMERIC", text: "$\\frac{6}{8}$ ni qisqartiring", answer: { value: "3/4" } };
    const put = await call("PUT", `/admin/questions/${q.id}`, teacher, numeric);
    expect(put.json()).toMatchObject(numeric);
    expect(put.json()).not.toHaveProperty("options");

    expect((await call("DELETE", `/admin/questions/${q.id}`, teacher)).statusCode).toBe(204);
    expect((await call("GET", `/admin/questions/${q.id}`, teacher)).statusCode).toBe(404);
  });

  it("noto'g'ri savol 400: javob variantda yo'q, son o'qilmaydi", async () => {
    const t = await newTopic();
    expect((await create(t.id, { ...single, answer: { optionId: "z" } })).statusCode).toBe(400);
    const bad = await create(t.id, { type: "NUMERIC", text: "?", answer: { value: "uch" } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().message).toContain("answer.value");
    expect((await call("POST", "/admin/topics/yoq/questions", teacher, single)).statusCode).toBe(404);
  });

  it("BR-C03: savoli bor mavzuni o'chirib bo'lmaydi (409)", async () => {
    const t = await newTopic();
    await create(t.id);
    const res = await call("DELETE", `/admin/topics/${t.id}`, teacher);
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe("NOT_EMPTY");
  });

  it("BR-Q01: to'g'ri javob audit jurnaliga yozilmaydi", async () => {
    const t = await newTopic();
    const q = (await create(t.id)).json();
    await call("PUT", `/admin/questions/${q.id}`, teacher, { ...single, answer: { optionId: "a" } });
    const logs = await prisma.auditLog.findMany({ where: { entityId: q.id } });
    expect(logs.map((l) => l.action).sort()).toEqual(["question.create", "question.update"]);
    expect(JSON.stringify(logs)).not.toContain("optionId");
  });

  it("savollar tartibini almashtirish", async () => {
    const t = await newTopic();
    const a = (await create(t.id)).json();
    const b = (await create(t.id)).json();
    const res = await call("POST", "/admin/reorder", teacher, { kind: "question", ids: [b.id, a.id] });
    expect(res.statusCode).toBe(204);
    const list = (await call("GET", `/admin/topics/${t.id}/questions`, teacher)).json();
    expect(list.map((q: { id: string }) => q.id)).toEqual([b.id, a.id]);
    const partial = await call("POST", "/admin/reorder", teacher, { kind: "question", ids: [a.id] });
    expect(partial.statusCode).toBe(400);
  });
});
