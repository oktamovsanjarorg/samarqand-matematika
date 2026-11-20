import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, loginAs } from "./helpers";

const prisma = new PrismaClient();
let app: NestFastifyApplication;
let teacher: Record<string, string>;
let assistant: Record<string, string>;
let student: Record<string, string>;
const tgIds: bigint[] = [];
const courseIds: string[] = [];

type Method = "GET" | "POST" | "PUT";
const call = (method: Method, url: string, headers: Record<string, string>, payload?: object) =>
  app.inject({ method, url: `/api${url}`, headers, ...(payload ? { payload } : {}) });

const options = [
  { id: "a", text: "1" },
  { id: "b", text: "2" },
];
const SINGLE = { type: "SINGLE", text: "1+1?", options, answer: { optionId: "b" }, solution: "1+1=2" };
const NUMERIC = { type: "NUMERIC", text: "1/2+1/4?", answer: { value: "3/4" }, solution: "2/4+1/4" };
const WRITTEN = { type: "WRITTEN", text: "Isbotlang" };

/** Nashr qilingan kurs, mavzu va uchta nashr qilingan savol (+1 qoralama) */
async function setup() {
  const c = (
    await call("POST", "/admin/courses", teacher, { title: "Test kursi", isPublished: true })
  ).json();
  courseIds.push(c.id);
  const t = (await call("POST", `/admin/courses/${c.id}/topics`, teacher, { title: "Kasrlar" })).json();
  const add = async (q: object, isPublished = true) =>
    (await call("POST", `/admin/topics/${t.id}/questions`, teacher, { ...q, isPublished })).json();
  const qs = [await add(SINGLE), await add(NUMERIC), await add(WRITTEN)];
  await add(SINGLE, false);
  return { topicId: t.id as string, qs: qs as { id: string }[] };
}

beforeAll(async () => {
  app = await createApp();
  const t = await loginAs(app, { owner: true });
  const s = await loginAs(app);
  const a = await loginAs(app);
  await prisma.user.update({ where: { telegramId: a.telegramId }, data: { role: "ASSISTANT" } });
  teacher = t.headers;
  student = s.headers;
  assistant = a.headers;
  tgIds.push(t.telegramId, s.telegramId, a.telegramId);
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  await prisma.topicAttempt.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.question.deleteMany({ where: { topic: { courseId: { in: courseIds } } } });
  await prisma.topic.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
  await prisma.$disconnect();
  await app.close();
});

describe("Mavzu testi", () => {
  it("BR-P04: to'liq kirishsiz o'quvchiga 403 LOCKED, tokensiz 401", async () => {
    const { topicId } = await setup();
    const res = await call("POST", `/topics/${topicId}/attempts`, student);
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("LOCKED");
    expect((await call("POST", `/topics/${topicId}/attempts`, {})).statusCode).toBe(401);
  });

  it("BR-P02, BR-P03: faqat nashr qilingan savollar, javobsiz; ochiq urinish davom etadi", async () => {
    const { topicId, qs } = await setup();
    const res = await call("POST", `/topics/${topicId}/attempts`, assistant);
    expect(res.statusCode).toBe(201);
    const view = res.json();
    expect(view.status).toBe("OPEN");
    expect(view.questions.map((q: { question: { id: string } }) => q.question.id)).toEqual(
      qs.map((q) => q.id),
    );
    expect(res.body).not.toContain("optionId");
    expect(res.body).not.toContain("3/4");
    expect(res.body).not.toContain("1+1=2");
    expect((await call("POST", `/topics/${topicId}/attempts`, assistant)).json().id).toBe(view.id);
  });

  it("javob saqlash, topshirish va natija izohlar bilan", async () => {
    const { topicId, qs } = await setup();
    const { id } = (await call("POST", `/topics/${topicId}/attempts`, assistant)).json();
    const [s, n, w] = qs as [{ id: string }, { id: string }, { id: string }];
    const save = (q: string, response: unknown) =>
      call("PUT", `/attempts/${id}/answers/${q}`, assistant, { response });
    expect((await save(s.id, { optionId: "b" })).statusCode).toBe(204);
    expect((await save(n.id, { value: "0,7" })).statusCode).toBe(204);
    expect((await save(n.id, { value: "0,75" })).statusCode).toBe(204);
    expect((await save(w.id, { text: "chunki..." })).statusCode).toBe(204);
    expect((await save(s.id, { value: "b" })).statusCode).toBe(400);
    expect((await save("yoq", { optionId: "a" })).statusCode).toBe(404);

    const resumed = (await call("GET", `/attempts/${id}`, assistant)).json();
    expect(resumed.questions[1].response).toEqual({ value: "0,75" });

    const res = await call("POST", `/attempts/${id}/submit`, assistant);
    expect(res.statusCode).toBe(200);
    const result = res.json();
    expect(result).toMatchObject({ status: "SUBMITTED", correct: 2, checkable: 2, total: 3 });
    expect(result.items.map((i: { result: string }) => i.result)).toEqual(["CORRECT", "CORRECT", "MANUAL"]);
    expect(result.items[1]).toMatchObject({ answer: { value: "3/4" }, solution: "2/4+1/4" });
    expect(result.items[2].answer).toBeNull();

    expect((await call("POST", `/attempts/${id}/submit`, assistant)).statusCode).toBe(409);
    expect((await save(s.id, { optionId: "a" })).statusCode).toBe(409);
    expect((await call("GET", `/attempts/${id}`, assistant)).json().status).toBe("SUBMITTED");
    expect((await call("POST", `/topics/${topicId}/attempts`, assistant)).json().id).not.toBe(id);
  });

  it("BR-P05: boshqa foydalanuvchining urinishi 404, ishlatilgan savol o'chmaydi (409)", async () => {
    const { topicId, qs } = await setup();
    const { id } = (await call("POST", `/topics/${topicId}/attempts`, assistant)).json();
    expect((await call("GET", `/attempts/${id}`, student)).statusCode).toBe(404);
    expect((await call("GET", `/attempts/${id}`, teacher)).statusCode).toBe(404);
    expect((await call("POST", `/attempts/${id}/submit`, student)).statusCode).toBe(404);
    const del = await app.inject({
      method: "DELETE",
      url: `/api/admin/questions/${qs[0]?.id}`,
      headers: teacher,
    });
    expect(del.statusCode).toBe(409);
  });

  it("savoli yo'q yoki nashr qilinmagan kursdagi mavzu 404", async () => {
    const c = (await call("POST", "/admin/courses", teacher, { title: "Qoralama" })).json();
    courseIds.push(c.id);
    const t = (await call("POST", `/admin/courses/${c.id}/topics`, teacher, { title: "Bo'sh" })).json();
    expect((await call("POST", `/topics/${t.id}/attempts`, assistant)).statusCode).toBe(404);
  });

  it("BR-C01: kurslar ro'yxatida mavzuning savollar soni, testi bor mavzu darssiz ham ko'rinadi", async () => {
    const { topicId } = await setup();
    const courses = (await call("GET", "/courses", student)).json();
    const t = courses
      .flatMap((c: { topics: { id: string }[] }) => c.topics)
      .find((x: { id: string }) => x.id === topicId);
    expect(t).toMatchObject({ questionCount: 3, lessons: [] });
  });

  it("T-024: /me/stats o'z urinishlarini sanaydi, ochiq testni ko'rsatadi; o'quvchi bo'lmaganga 403", async () => {
    const { topicId, qs } = await setup();
    const s = await loginAs(app);
    tgIds.push(s.telegramId);
    await prisma.studentProfile.upsert({
      where: { userId: (await prisma.user.findUniqueOrThrow({ where: { telegramId: s.telegramId } })).id },
      update: { accessMode: "FREE" },
      create: { user: { connect: { telegramId: s.telegramId } }, accessMode: "FREE" },
    });
    const empty = (await call("GET", "/me/stats", s.headers)).json();
    expect(empty).toMatchObject({ open: null, tests: 0, averagePercent: null, recent: [], topics: [] });

    const att = (await call("POST", `/topics/${topicId}/attempts`, s.headers)).json();
    await call("PUT", `/attempts/${att.id}/answers/${qs[0]?.id}`, s.headers, { response: { optionId: "b" } });
    const mid = (await call("GET", "/me/stats", s.headers)).json();
    expect(mid.open).toMatchObject({ attemptId: att.id, answered: 1, total: 3, topicTitle: "Kasrlar" });

    await call("POST", `/attempts/${att.id}/submit`, s.headers);
    const after = (await call("GET", "/me/stats", s.headers)).json();
    expect(after).toMatchObject({ open: null, tests: 1, averagePercent: 50 });
    expect(after.recent[0]).toMatchObject({ id: att.id, correct: 1, checkable: 2 });
    expect(after.topics).toEqual([{ topicId, topicTitle: "Kasrlar", attempts: 1, bestPercent: 50 }]);

    expect((await call("GET", "/me/stats", teacher)).statusCode).toBe(403);
    expect((await call("GET", "/me/stats", {})).statusCode).toBe(401);
  });
});
