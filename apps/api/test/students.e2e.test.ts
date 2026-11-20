import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { internalKey } from "@samarqand/shared/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BOT_TOKEN, createApp, loginAs } from "./helpers";

const prisma = new PrismaClient();
let app: NestFastifyApplication;
let teacher: Record<string, string>;
const tgIds: bigint[] = [];
const courseIds: string[] = [];

type Method = "GET" | "POST" | "PATCH";
const call = (method: Method, url: string, headers: Record<string, string>, payload?: object) =>
  app.inject({ method, url: `/api${url}`, headers, ...(payload ? { payload } : {}) });
const KEY = { "x-internal-key": internalKey(BOT_TOKEN) };

async function newStudent() {
  const s = await loginAs(app);
  tgIds.push(s.telegramId);
  const me = (await call("GET", "/me", s.headers)).json() as { id: string };
  return { ...s, id: me.id, tg: Number(s.telegramId) };
}
const sharePhone = (tg: number, userId: number, phone = "998 90 123 45 67") =>
  call("POST", "/internal/user-phone", KEY, {
    from: { id: tg, first_name: "U" },
    contact: { phone_number: phone, user_id: userId },
  });

beforeAll(async () => {
  app = await createApp();
  const t = await loginAs(app, { owner: true });
  teacher = t.headers;
  tgIds.push(t.telegramId);
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.lesson.deleteMany({ where: { topic: { courseId: { in: courseIds } } } });
  await prisma.topic.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
  await prisma.$disconnect();
  await app.close();
});

describe("Onboarding", () => {
  it("yangi o'quvchi: onboarding kerak, kirish yopiq", async () => {
    const s = await newStudent();
    const p = (await call("GET", "/me/profile", s.headers)).json();
    expect(p).toEqual({
      fullName: null,
      hasPhone: false,
      needsOnboarding: true,
      access: { full: false, accepted: false, parentApproved: false, paid: false, mode: "AUTO" },
    });
  });

  it("BR-S01: ism-familiya kamida ikki so'z, ortiqcha bo'shliq tozalanadi", async () => {
    const s = await newStudent();
    expect((await call("POST", "/me/name", s.headers, { fullName: "Ali" })).statusCode).toBe(400);
    expect((await call("POST", "/me/name", s.headers, { fullName: "Ali 123" })).statusCode).toBe(400);
    const res = await call("POST", "/me/name", s.headers, { fullName: "  Gʻulom   Oʻrinov " });
    expect(res.statusCode).toBe(200);
    expect(res.json().fullName).toBe("Gʻulom Oʻrinov");
    expect((await call("POST", "/me/name", teacher, { fullName: "A B" })).statusCode).toBe(403);
  });

  it("BR-S02: faqat o'z raqami saqlanadi, kalitsiz 401", async () => {
    const s = await newStudent();
    expect((await call("POST", "/internal/user-phone", {}, {})).statusCode).toBe(401);
    expect((await sharePhone(s.tg, s.tg + 1)).json().status).toBe("foreign");
    expect((await sharePhone(1, 1)).json().status).toBe("unknown");
    expect((await sharePhone(s.tg, s.tg)).json().status).toBe("saved");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: s.id } });
    expect(user.phone).toBe("+998901234567");
    await call("POST", "/me/name", s.headers, { fullName: "Ali Valiyev" });
    expect((await call("GET", "/me/profile", s.headers)).json().needsOnboarding).toBe(false);
  });
});

describe("Admin: o'quvchilar", () => {
  it("o'quvchi ro'yxatga kira olmaydi (403)", async () => {
    const s = await newStudent();
    expect((await call("GET", "/admin/students", s.headers)).statusCode).toBe(403);
    expect((await call("POST", `/admin/students/${s.id}/accept`, s.headers)).statusCode).toBe(403);
    expect(
      (await call("PATCH", `/admin/students/${s.id}`, s.headers, { accessMode: "FREE" })).statusCode,
    ).toBe(403);
  });

  it("BR-S03: yangilar ro'yxati, qabul qilish, keyin ism qulflanadi (BR-S01)", async () => {
    const s = await newStudent();
    await call("POST", "/me/name", s.headers, { fullName: "Bahrom Qodirov" });
    const fresh = (await call("GET", "/admin/students?filter=new&q=bahrom", teacher)).json();
    expect(fresh.map((r: { id: string }) => r.id)).toContain(s.id);

    const accepted = (await call("POST", `/admin/students/${s.id}/accept`, teacher)).json();
    expect(accepted.acceptedAt).not.toBeNull();
    const after = (await call("GET", "/admin/students?filter=new", teacher)).json();
    expect(after.map((r: { id: string }) => r.id)).not.toContain(s.id);

    const res = await call("POST", "/me/name", s.headers, { fullName: "Boshqa Ism" });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe("NAME_LOCKED");
    const renamed = await call("PATCH", `/admin/students/${s.id}`, teacher, { fullName: "Bahrom Qodiriy" });
    expect(renamed.json().fullName).toBe("Bahrom Qodiriy");
    const logs = await prisma.auditLog.findMany({ where: { entityId: s.id } });
    expect(JSON.stringify(logs)).not.toContain("Qodiriy");
  });

  it("mavjud boʻlmagan oʻquvchi 404", async () => {
    expect((await call("POST", "/admin/students/yoq/accept", teacher)).statusCode).toBe(404);
  });
});

describe("Kirish rejimi", () => {
  it("BR-A04, BR-S03: FREE pullik darsni ochadi, CLOSED va AUTO (to'lovsiz) yopadi", async () => {
    const s = await newStudent();
    const c = (await call("POST", "/admin/courses", teacher, { title: "Kirish", isPublished: true })).json();
    courseIds.push(c.id);
    const t = (await call("POST", `/admin/courses/${c.id}/topics`, teacher, { title: "M" })).json();
    const l = (
      await call("POST", `/admin/topics/${t.id}/lessons`, teacher, { title: "D", isPublished: true })
    ).json();
    const open = async () => (await call("GET", `/lessons/${l.id}`, s.headers)).statusCode;

    await call("POST", `/admin/students/${s.id}/accept`, teacher);
    expect(await open()).toBe(403);
    await call("PATCH", `/admin/students/${s.id}`, teacher, { accessMode: "FREE" });
    expect(await open()).toBe(200);
    expect((await call("GET", "/me/profile", s.headers)).json().access).toEqual({
      full: true,
      accepted: true,
      parentApproved: false,
      paid: false,
      mode: "FREE",
    });
    await call("PATCH", `/admin/students/${s.id}`, teacher, { accessMode: "CLOSED" });
    expect(await open()).toBe(403);
    expect((await call("PATCH", `/admin/students/${s.id}`, teacher, {})).statusCode).toBe(400);
  });
});
