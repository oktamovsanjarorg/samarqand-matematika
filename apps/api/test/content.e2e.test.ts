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

type Method = "GET" | "POST" | "PATCH" | "DELETE";
const call = (method: Method, url: string, headers: Record<string, string>, payload?: object) =>
  app.inject({ method, url: `/api${url}`, headers, ...(payload ? { payload } : {}) });

async function course(title = `Kurs ${Math.random()}`, isPublished = true) {
  const c = (await call("POST", "/admin/courses", teacher, { title, isPublished })).json();
  courseIds.push(c.id);
  return c as { id: string };
}
const topic = async (courseId: string, title = "Mavzu") =>
  (await call("POST", `/admin/courses/${courseId}/topics`, teacher, { title })).json() as { id: string };
const lesson = async (topicId: string, extra: object = {}) =>
  (
    await call("POST", `/admin/topics/${topicId}/lessons`, teacher, {
      title: "Dars",
      isPublished: true,
      ...extra,
    })
  ).json() as {
    id: string;
  };

beforeAll(async () => {
  app = await createApp();
  const t = await loginAs(app, { owner: true });
  const s = await loginAs(app);
  teacher = t.headers;
  student = s.headers;
  tgIds.push(t.telegramId, s.telegramId);
});

afterAll(async () => {
  await prisma.lesson.deleteMany({ where: { topic: { courseId: { in: courseIds } } } });
  await prisma.topic.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
  // T-099: testda o'chirilgan kontent axlat qutisida qolmasin
  await prisma.trashItem.deleteMany({ where: { deletedById: { in: users.map((u) => u.id) } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
  await prisma.$disconnect();
  await app.close();
});

describe("Admin kontent: ruxsatlar", () => {
  it("oʻquvchi admin endpoint'lariga kira olmaydi (403)", async () => {
    expect((await call("GET", "/admin/courses", student)).statusCode).toBe(403);
    expect((await call("POST", "/admin/courses", student, { title: "X" })).statusCode).toBe(403);
  });

  it("tokensiz 401", async () => {
    expect((await call("GET", "/admin/courses", {})).statusCode).toBe(401);
  });
});

describe("Admin kontent: CRUD", () => {
  it("kurs → mavzu → dars yaratiladi va daraxtda ko'rinadi", async () => {
    const c = await course("Algebra");
    const t = await topic(c.id, "Kvadrat tenglamalar");
    const l = await lesson(t.id, { body: "$x^2=4$", isFree: true });
    const tree = (await call("GET", "/admin/courses", teacher)).json() as {
      id: string;
      topics: { lessons: { id: string }[] }[];
    }[];
    const found = tree.find((x) => x.id === c.id);
    expect(found?.topics[0]?.lessons[0]?.id).toBe(l.id);
    const detail = (await call("GET", `/admin/lessons/${l.id}`, teacher)).json();
    expect(detail.body).toBe("$x^2=4$");
  });

  it("validatsiya: bo'sh nom va noto'g'ri video havola 400", async () => {
    expect((await call("POST", "/admin/courses", teacher, { title: "  " })).statusCode).toBe(400);
    const t = await topic((await course()).id);
    const res = await call("POST", `/admin/topics/${t.id}/lessons`, teacher, { title: "D", videoUrl: "yoq" });
    expect(res.statusCode).toBe(400);
  });

  it("BR-C03: ichida mavzu bor kursni o'chirib bo'lmaydi (409), bo'shini o'chirsa bo'ladi", async () => {
    const c = await course();
    const t = await topic(c.id);
    expect((await call("DELETE", `/admin/courses/${c.id}`, teacher)).statusCode).toBe(409);
    expect((await call("DELETE", `/admin/topics/${t.id}`, teacher)).statusCode).toBe(204);
    expect((await call("DELETE", `/admin/courses/${c.id}`, teacher)).statusCode).toBe(204);
  });

  it("BR-C04: darsni tahrirlash auditga tushadi (matnsiz, faqat maydon nomlari)", async () => {
    const l = await lesson((await topic((await course()).id)).id);
    expect((await call("PATCH", `/admin/lessons/${l.id}`, teacher, { body: "yangi" })).statusCode).toBe(200);
    const log = await prisma.auditLog.findFirst({ where: { entityId: l.id, action: "lesson.update" } });
    expect(log?.data).toEqual({ fields: ["body"] });
  });

  it("mavjud bo'lmagan dars 404", async () => {
    expect((await call("GET", "/admin/lessons/yoq", teacher)).statusCode).toBe(404);
  });
});

describe("Tartiblash", () => {
  it("mavzudagi darslar tartibi o'zgaradi", async () => {
    const t = await topic((await course()).id);
    const a = await lesson(t.id, { title: "A" });
    const b = await lesson(t.id, { title: "B" });
    const res = await call("POST", "/admin/reorder", teacher, { kind: "lesson", ids: [b.id, a.id] });
    expect(res.statusCode).toBe(204);
    const rows = await prisma.lesson.findMany({ where: { topicId: t.id }, orderBy: { order: "asc" } });
    expect(rows.map((r) => r.title)).toEqual(["B", "A"]);
  });

  it("to'liq bo'lmagan yoki boshqa mavzudagi ro'yxat rad etiladi (400)", async () => {
    const t1 = await topic((await course()).id);
    const t2 = await topic((await course()).id);
    const a = await lesson(t1.id);
    await lesson(t1.id);
    const c = await lesson(t2.id);
    expect((await call("POST", "/admin/reorder", teacher, { kind: "lesson", ids: [a.id] })).statusCode).toBe(
      400,
    );
    expect(
      (await call("POST", "/admin/reorder", teacher, { kind: "lesson", ids: [a.id, c.id] })).statusCode,
    ).toBe(400);
  });
});

describe("O'quvchi ko'rinishi", () => {
  it("BR-C01: nashr qilinmagan kurs va dars ko'rinmaydi", async () => {
    const hidden = await course("Yashirin", false);
    await lesson((await topic(hidden.id)).id);
    const open = await course("Ochiq");
    const t = await topic(open.id);
    await lesson(t.id, { title: "Qoralama", isPublished: false });
    const pub = await lesson(t.id, { title: "Nashr", isFree: true });

    const list = (await call("GET", "/courses", student)).json() as {
      id: string;
      topics: { lessons: { id: string }[] }[];
    }[];
    expect(list.some((c) => c.id === hidden.id)).toBe(false);
    const mine = list.find((c) => c.id === open.id);
    expect(mine?.topics[0]?.lessons.map((l) => l.id)).toEqual([pub.id]);
  });

  it("BR-C02: bepul dars ochiq, pullik dars LOCKED (403), ro'yxatda locked: true", async () => {
    const t = await topic((await course()).id);
    const free = await lesson(t.id, { isFree: true, body: "ochiq" });
    const paid = await lesson(t.id, { body: "yopiq" });
    expect((await call("GET", `/lessons/${free.id}`, student)).json().body).toBe("ochiq");
    const res = await call("GET", `/lessons/${paid.id}`, student);
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("LOCKED");
    expect(res.body).not.toContain("yopiq");
  });

  it("ustoz pullik darsni ham ochadi", async () => {
    const t = await topic((await course()).id);
    const paid = await lesson(t.id, { body: "yopiq" });
    expect((await call("GET", `/lessons/${paid.id}`, teacher)).json().body).toBe("yopiq");
  });

  it("nashr qilinmagan darsni to'g'ridan-to'g'ri havola bilan ham ochib bo'lmaydi (404)", async () => {
    const t = await topic((await course()).id);
    const draft = await lesson(t.id, { isPublished: false, isFree: true });
    expect((await call("GET", `/lessons/${draft.id}`, student)).statusCode).toBe(404);
  });

  it("T-066: darsda qo'shni darslar (nashr qilinmagani tashlab o'tiladi, pullik yopiq) va mavzu testi soni", async () => {
    const t = await topic((await course()).id);
    const a = await lesson(t.id, { title: "Birinchi", isFree: true });
    await lesson(t.id, { title: "Qoralama", isPublished: false, isFree: true });
    const c = await lesson(t.id, { title: "Uchinchi" });
    const view = (await call("GET", `/lessons/${a.id}`, student)).json();
    expect(view).toMatchObject({ topicId: t.id, questionCount: 0, prev: null });
    expect(view.next).toEqual({ id: c.id, title: "Uchinchi", locked: true });
    const back = (await call("GET", `/lessons/${c.id}`, teacher)).json();
    expect(back.prev).toEqual({ id: a.id, title: "Birinchi", locked: false });
    expect(back.next).toBeNull();
  });
});
