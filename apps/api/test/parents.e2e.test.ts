import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { internalKey } from "@samarqand/shared/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BOT_TOKEN, createApp, initData, loginAs, tgId } from "./helpers";

const prisma = new PrismaClient();
let app: NestFastifyApplication;
let teacher: Record<string, string>;
const tgIds: bigint[] = [];
const KEY = { "x-internal-key": internalKey(BOT_TOKEN) };

const post = (url: string, headers: Record<string, string>, payload: object = {}) =>
  app.inject({ method: "POST", url: `/api${url}`, headers, payload });
const get = (url: string, headers: Record<string, string>) =>
  app.inject({ method: "GET", url: `/api${url}`, headers });

async function newStudent() {
  const s = await loginAs(app);
  tgIds.push(s.telegramId);
  const tg = Number(s.telegramId);
  const { code } = (await post("/internal/parent-code", KEY, { from: { id: tg, first_name: "O" } })).json();
  const id = (await get("/me", s.headers)).json().id as string;
  return { ...s, tg, code: code as string, id };
}
function parentFrom() {
  const id = tgId();
  tgIds.push(BigInt(id));
  return { id, first_name: "Ota" };
}
const link = (
  code: string,
  from: { id: number; first_name: string },
  opts: { userId?: number; phone?: string } = {},
) =>
  post("/internal/parent-link", KEY, {
    code,
    from,
    contact: { phone_number: opts.phone ?? "+998 91 000 00 01", user_id: opts.userId ?? from.id },
  });
async function parentHeaders(from: { id: number; first_name: string }) {
  const res = await post("/auth/telegram", {}, { initData: initData(from) });
  return { authorization: `Bearer ${res.json().token}` };
}

beforeAll(async () => {
  app = await createApp();
  const t = await loginAs(app, { owner: true });
  teacher = t.headers;
  tgIds.push(t.telegramId);
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
  await prisma.$disconnect();
  await app.close();
});

describe("Ota-ona kodi", () => {
  it("o'quvchiga doimiy kod, xodimga null, kalitsiz 401", async () => {
    const s = await newStudent();
    expect(s.code).toMatch(/^[0-9A-F]{8}$/);
    const again = await post("/internal/parent-code", KEY, { from: { id: s.tg, first_name: "O" } });
    expect(again.json().code).toBe(s.code);
    expect(
      (await post("/internal/parent-code", {}, { from: { id: s.tg, first_name: "O" } })).statusCode,
    ).toBe(401);
    expect(
      (await post("/internal/parent-code", KEY, { from: { id: 1, first_name: "X" } })).json().code,
    ).toBeNull();
  });
});

describe("Ota-ona ulanishi", () => {
  it("noto'g'ri kod, begona raqam va o'quvchining o'zi rad etiladi", async () => {
    const s = await newStudent();
    const p = parentFrom();
    expect((await link("00000000", p)).json().status).toBe("invalid_code");
    expect((await link(s.code, p, { userId: p.id + 1 })).json().status).toBe("not_own_contact");
    expect((await link(s.code, { id: s.tg, first_name: "O" })).json().status).toBe("self");
  });

  it("so'rov yaratiladi, hisob PARENT bo'ladi, takrori exists, ikkitadan ko'pi limit", async () => {
    const s = await newStudent();
    const p1 = parentFrom();
    expect((await link(s.code, p1)).json()).toMatchObject({ status: "created" });
    const parent = await prisma.user.findUniqueOrThrow({ where: { telegramId: BigInt(p1.id) } });
    expect(parent).toMatchObject({ role: "PARENT", phone: "+998910000001" });
    expect((await link(s.code.toLowerCase(), p1)).json().status).toBe("exists");
    expect((await link(s.code, parentFrom())).json().status).toBe("created");
    expect((await link(s.code, parentFrom())).json().status).toBe("limit");
  });

  it("o'quvchi raqami bilan bir xil raqam shubhali belgilanadi", async () => {
    const s = await newStudent();
    await prisma.user.update({ where: { id: s.id }, data: { phone: "+998935550000" } });
    await link(s.code, parentFrom(), { phone: "998935550000" });
    const rows = (await get("/admin/parent-links?status=PENDING", teacher)).json();
    const row = rows.find((r: { studentId: string }) => r.studentId === s.id);
    expect(row.flags).toEqual(["same_phone"]);
    expect(rows[0].flags.length).toBeGreaterThanOrEqual(row.flags.length);
  });
});

describe("Ustoz navbati", () => {
  it("o'quvchi va ota-ona navbatga kira olmaydi (403)", async () => {
    const s = await newStudent();
    const p = parentFrom();
    await link(s.code, p);
    expect((await get("/admin/parent-links", s.headers)).statusCode).toBe(403);
    expect((await get("/admin/parent-links", await parentHeaders(p))).statusCode).toBe(403);
    expect((await get("/me/children", s.headers)).statusCode).toBe(403);
  });

  it("BR-A04: tasdiqlash, farzand ko'rinadi, qayta ko'rib chiqish 409", async () => {
    const s = await newStudent();
    await post("/me/name", s.headers, { fullName: "Dilnoza Karimova" });
    const p = parentFrom();
    await link(s.code, p);
    const row = (await get("/admin/parent-links?status=PENDING", teacher))
      .json()
      .find((r: { studentId: string }) => r.studentId === s.id);
    const ok = await post(`/admin/parent-links/${row.id}/approve`, teacher);
    expect(ok.json()).toMatchObject({ status: "APPROVED", studentName: "Dilnoza Karimova" });
    expect((await post(`/admin/parent-links/${row.id}/approve`, teacher)).statusCode).toBe(409);
    const children = (await get("/me/children", await parentHeaders(p))).json();
    expect(children).toEqual([
      { studentId: expect.any(String), name: "Dilnoza Karimova", status: "APPROVED" },
    ]);
  });

  it("rad etish sabab bilan; keyin qayta ulanish rejected_before", async () => {
    const s = await newStudent();
    const p = parentFrom();
    await link(s.code, p);
    const row = (await get("/admin/parent-links?status=PENDING", teacher))
      .json()
      .find((r: { studentId: string }) => r.studentId === s.id);
    expect((await post(`/admin/parent-links/${row.id}/reject`, teacher, { reason: "" })).statusCode).toBe(
      400,
    );
    const res = await post(`/admin/parent-links/${row.id}/reject`, teacher, {
      reason: "Raqam javob bermadi",
    });
    expect(res.json()).toMatchObject({ status: "REJECTED", rejectReason: "Raqam javob bermadi" });
    expect((await link(s.code, p)).json().status).toBe("rejected_before");
    expect((await post("/admin/parent-links/yoq/approve", teacher)).statusCode).toBe(404);
  });
});
