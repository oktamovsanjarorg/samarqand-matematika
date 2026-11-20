import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WeeklyScheduler } from "../src/weekly/weekly-scheduler";
import { createApp, loginAs, sentMessages } from "./helpers";

const prisma = new PrismaClient();
let app: NestFastifyApplication;
let teacher: Record<string, string>;
const tgIds: bigint[] = [];
const courseIds: string[] = [];
const HOUR = 3_600_000;

type Method = "GET" | "POST" | "PUT" | "DELETE";
const call = (method: Method, url: string, headers: Record<string, string>, payload?: object) =>
  app.inject({ method, url: `/api${url}`, headers, ...(payload ? { payload } : {}) });
const at = (ms: number) => new Date(Date.now() + ms).toISOString();
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32)]);
const photo = (
  headers: Record<string, string>,
  p: { attemptId: string; qid: string; body?: Buffer; type?: string },
) =>
  app.inject({
    method: "POST",
    url: `/api/weekly-attempts/${p.attemptId}/answers/${p.qid}/photos`,
    headers: { ...headers, "content-type": p.type ?? "image/png" },
    payload: p.body ?? PNG,
  });

async function questions() {
  const c = (await call("POST", "/admin/courses", teacher, { title: "Haftalik kurs" })).json();
  courseIds.push(c.id);
  const t = (await call("POST", `/admin/courses/${c.id}/topics`, teacher, { title: "Aralash" })).json();
  const add = async (q: object) =>
    (await call("POST", `/admin/topics/${t.id}/questions`, teacher, q)).json().id as string;
  return [
    await add({
      type: "SINGLE",
      text: "1+1?",
      options: [
        { id: "a", text: "1" },
        { id: "b", text: "2" },
      ],
      answer: { optionId: "b" },
    }),
    await add({ type: "NUMERIC", text: "1/2+1/4?", answer: { value: "3/4" } }),
  ];
}

async function weekly(qids: string[], opens = -HOUR, closes = 48 * HOUR) {
  const res = await call("POST", "/admin/weekly", teacher, {
    title: "1-hafta",
    opensAt: at(opens),
    closesAt: at(closes),
    questionIds: qids,
    isPublished: true,
  });
  expect(res.statusCode).toBe(201);
  return res.json().id as string;
}

async function student(free = true) {
  const s = await loginAs(app);
  tgIds.push(s.telegramId);
  const u = await prisma.user.findUniqueOrThrow({
    where: { telegramId: s.telegramId },
    select: { id: true },
  });
  if (free)
    await prisma.studentProfile.upsert({
      where: { userId: u.id },
      update: { accessMode: "FREE" },
      create: { userId: u.id, accessMode: "FREE" },
    });
  return { ...s, id: u.id, telegramId: s.telegramId };
}

const tick = (now = new Date()) => app.get(WeeklyScheduler).tick(now);
const messagesTo = (tg: bigint) => sentMessages.filter((m) => m.chatId === tg).map((m) => m.html);

beforeAll(async () => {
  app = await createApp();
  const t = await loginAs(app, { owner: true });
  teacher = t.headers;
  tgIds.push(t.telegramId);
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  await prisma.weeklyTest.deleteMany({
    where: { questions: { some: { question: { topic: { courseId: { in: courseIds } } } } } },
  });
  await prisma.question.deleteMany({ where: { topic: { courseId: { in: courseIds } } } });
  await prisma.topic.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
  await prisma.$disconnect();
  await app.close();
});

describe("Haftalik test", () => {
  it("ruxsat: o'quvchi admin API'ga 403, tokensiz 401; noto'g'ri oyna va noma'lum savol 400", async () => {
    const s = await student();
    const qids = await questions();
    expect((await call("GET", "/admin/weekly", s.headers)).statusCode).toBe(403);
    expect((await call("GET", "/weekly", {})).statusCode).toBe(401);
    const bad = { title: "X", opensAt: at(HOUR), closesAt: at(0), questionIds: qids };
    expect((await call("POST", "/admin/weekly", teacher, bad)).statusCode).toBe(400);
    expect(
      (await call("POST", "/admin/weekly", teacher, { ...bad, closesAt: at(2 * HOUR), questionIds: ["yoq"] }))
        .statusCode,
    ).toBe(400);
  });

  it("BR-W01: oyna ochilmagan bo'lsa 409; to'liq kirishsiz 403 LOCKED", async () => {
    const qids = await questions();
    const upcoming = await weekly(qids, HOUR, 48 * HOUR);
    const s = await student();
    expect((await call("POST", `/weekly/${upcoming}/attempts`, s.headers)).json().message).toBe(
      "Test hali ochilmagan",
    );
    const open = await weekly(qids);
    const locked = await call("POST", `/weekly/${open}/attempts`, (await student(false)).headers);
    expect(locked.statusCode).toBe(403);
    expect(locked.json().code).toBe("LOCKED");
  });

  it("BR-W02, BR-W08: bitta urinish; topshirgach javob ham natija ham oyna yopilguncha yo'q", async () => {
    const qids = await questions();
    const id = await weekly(qids);
    const s = await student();
    const view = (await call("POST", `/weekly/${id}/attempts`, s.headers)).json();
    expect(view.status).toBe("OPEN");
    expect(JSON.stringify(view)).not.toContain('"answer"');
    expect((await call("POST", `/weekly/${id}/attempts`, s.headers)).json().id).toBe(view.id);
    await call("PUT", `/weekly-attempts/${view.id}/answers/${qids[0]}`, s.headers, {
      response: { optionId: "b" },
    });
    const sub = (await call("POST", `/weekly-attempts/${view.id}/submit`, s.headers)).json();
    expect(sub).toMatchObject({ status: "WAITING" });
    expect(JSON.stringify(sub)).not.toContain("correct");
    expect((await call("POST", `/weekly-attempts/${view.id}/submit`, s.headers)).statusCode).toBe(409);
    const row = (await call("GET", "/weekly", s.headers)).json().find((r: { id: string }) => r.id === id);
    expect(row.my).toEqual({ started: true, submitted: true, score: null });
  });

  it("BR-W03: yopilganda topshirgan ball oladi, topshirmagan 0; natija xabari; yopilgandan keyin javob 409", async () => {
    const qids = await questions();
    const id = await weekly(qids);
    const done = await student();
    const late = await student();
    const a = (await call("POST", `/weekly/${id}/attempts`, done.headers)).json();
    await call("PUT", `/weekly-attempts/${a.id}/answers/${qids[0]}`, done.headers, {
      response: { optionId: "b" },
    });
    expect((await photo(done.headers, { attemptId: a.id, qid: qids[0] ?? "" })).statusCode).toBe(201);
    await call("POST", `/weekly-attempts/${a.id}/submit`, done.headers);
    const b = (await call("POST", `/weekly/${id}/attempts`, late.headers)).json();
    await call("PUT", `/weekly-attempts/${b.id}/answers/${qids[0]}`, late.headers, {
      response: { optionId: "b" },
    });

    await prisma.weeklyTest.update({ where: { id }, data: { closesAt: new Date(Date.now() - 1000) } });
    await tick();
    const r1 = (await call("GET", `/weekly-attempts/${a.id}`, done.headers)).json();
    expect(r1).toMatchObject({ status: "RESULT", score: 1, total: 2 });
    expect(r1.items[1].answer).toEqual({ value: "3/4" });
    const r2 = (await call("GET", `/weekly-attempts/${b.id}`, late.headers)).json();
    expect(r2).toMatchObject({ status: "RESULT", score: 0, submittedAt: null });
    expect(r2.items[0].result).toBe("WRONG");
    expect(messagesTo(done.telegramId).at(-1)).toContain("natijasi: <b>1/2</b>");
    expect(messagesTo(late.telegramId).at(-1)).toContain("<b>0/2</b>");
    expect(
      (
        await call("PUT", `/weekly-attempts/${b.id}/answers/${qids[1]}`, late.headers, {
          response: { value: "3/4" },
        })
      ).statusCode,
    ).toBe(409);

    const table = (await call("GET", `/admin/weekly/${id}/standings`, teacher)).json();
    expect(table.map((x: { userId: string; score: number }) => [x.userId, x.score])).toEqual([
      [done.id, 1],
      [late.id, 0],
    ]);
    const before = sentMessages.length;
    await tick();
    expect(sentMessages.length).toBe(before);
  });

  it("BR-W07: 24 va 3 soat qolganda topshirmaganlarga bir martadan eslatma", async () => {
    const qids = await questions();
    const id = await weekly(qids, -HOUR, 20 * HOUR);
    const s = await student();
    await tick();
    expect(messagesTo(s.telegramId).filter((m) => m.includes("24 soat qoldi"))).toHaveLength(1);
    await tick();
    expect(messagesTo(s.telegramId).filter((m) => m.includes("soat qoldi"))).toHaveLength(1);
    await prisma.weeklyTest.update({ where: { id }, data: { closesAt: new Date(Date.now() + 2 * HOUR) } });
    await tick();
    expect(messagesTo(s.telegramId).filter((m) => m.includes("3 soat qoldi"))).toHaveLength(1);
  });

  it("boshlangan testning savollari o'zgarmaydi, o'chirilmaydi (409)", async () => {
    const qids = await questions();
    const id = await weekly(qids);
    const s = await student();
    await call("POST", `/weekly/${id}/attempts`, s.headers);
    const body = { title: "Yangi nom", opensAt: at(-HOUR), closesAt: at(48 * HOUR), isPublished: true };
    expect(
      (await call("PUT", `/admin/weekly/${id}`, teacher, { ...body, questionIds: [qids[0]] })).statusCode,
    ).toBe(409);
    expect(
      (await call("PUT", `/admin/weekly/${id}`, teacher, { ...body, questionIds: qids })).statusCode,
    ).toBe(200);
    expect((await call("DELETE", `/admin/weekly/${id}`, teacher)).statusCode).toBe(409);
    expect((await call("GET", `/admin/weekly/${id}`, teacher)).json()).toMatchObject({
      title: "Yangi nom",
      questionIds: qids,
      status: "OPEN",
    });
  });

  it("BR-W04: yechim rasmi 1–3 ta, faqat ochiq urinishga; rasmsiz to'g'ri javob 0", async () => {
    const qids = await questions();
    const [q0 = "", q1 = ""] = qids;
    const id = await weekly(qids);
    const s = await student();
    const other = await student();
    const a = (await call("POST", `/weekly/${id}/attempts`, s.headers)).json();
    expect(
      (
        await photo(s.headers, {
          attemptId: a.id,
          qid: q0,
          body: Buffer.from("rasm emas, matn"),
          type: "image/jpeg",
        })
      ).statusCode,
    ).toBe(400);
    expect((await photo(other.headers, { attemptId: a.id, qid: q0 })).statusCode).toBe(404);
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push((await photo(s.headers, { attemptId: a.id, qid: q0 })).json().id);
    expect((await photo(s.headers, { attemptId: a.id, qid: q0 })).statusCode).toBe(409);
    expect((await call("DELETE", `/weekly-attempts/${a.id}/photos/${ids[2]}`, s.headers)).statusCode).toBe(
      204,
    );
    const view = (await call("GET", `/weekly-attempts/${a.id}`, s.headers)).json();
    expect(view.questions[0].photos).toEqual(ids.slice(0, 2));
    expect(view.questions[1].photos).toEqual([]);

    const own = await call("GET", `/weekly-photos/${ids[0]}`, s.headers);
    expect(own.headers["content-type"]).toBe("image/png");
    expect((await call("GET", `/weekly-photos/${ids[0]}`, other.headers)).statusCode).toBe(404);
    expect((await call("GET", `/admin/weekly/photos/${ids[0]}`, s.headers)).statusCode).toBe(403);
    expect((await call("GET", `/admin/weekly/photos/${ids[0]}`, teacher)).statusCode).toBe(200);

    // Ikkala javob to'g'ri, lekin 2-savolga rasm yo'q: ball 1
    await call("PUT", `/weekly-attempts/${a.id}/answers/${q0}`, s.headers, { response: { optionId: "b" } });
    await call("PUT", `/weekly-attempts/${a.id}/answers/${q1}`, s.headers, { response: { value: "0,75" } });
    await call("POST", `/weekly-attempts/${a.id}/submit`, s.headers);
    expect((await photo(s.headers, { attemptId: a.id, qid: q1 })).statusCode).toBe(409);
    expect((await call("DELETE", `/weekly-attempts/${a.id}/photos/${ids[0]}`, s.headers)).statusCode).toBe(
      409,
    );
    await prisma.weeklyTest.update({ where: { id }, data: { closesAt: new Date(Date.now() - 1000) } });
    const r = (await call("GET", `/weekly-attempts/${a.id}`, s.headers)).json();
    expect(r.score).toBe(1);
    expect(r.items.map((i: { result: string; noPhoto: boolean }) => [i.result, i.noPhoto])).toEqual([
      ["CORRECT", false],
      ["CORRECT", true],
    ]);
  });
});
