import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { internalKey } from "@samarqand/shared/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BOT_TOKEN, createApp, loginAs, sentMessages, tgId } from "./helpers";

const prisma = new PrismaClient();
let app: NestFastifyApplication;
let teacher: { headers: Record<string, string>; telegramId: bigint };
const tgIds: bigint[] = [];
const KEY = { "x-internal-key": internalKey(BOT_TOKEN) };
const post = (url: string, headers: Record<string, string>, payload: object = {}) =>
  app.inject({ method: "POST", url: `/api${url}`, headers, payload });

const to = (chatId: bigint) => sentMessages.filter((m) => m.chatId === chatId);
const phone = (tg: number, number = "998901112233") =>
  post("/internal/user-phone", KEY, {
    from: { id: tg, first_name: "U" },
    contact: { phone_number: number, user_id: tg },
  });

async function student() {
  const s = await loginAs(app);
  tgIds.push(s.telegramId);
  return { ...s, tg: Number(s.telegramId) };
}

beforeAll(async () => {
  app = await createApp();
  teacher = await loginAs(app, { owner: true });
  tgIds.push(teacher.telegramId);
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
  await prisma.$disconnect();
  await app.close();
});

describe("Yangi o'quvchi xabari", () => {
  it("BR-S04: ism va telefon bo'lgach ustozga bir marta xabar", async () => {
    const s = await student();
    const before = to(teacher.telegramId).length;
    await post("/me/name", s.headers, { fullName: "Anvar Toshev" });
    expect(to(teacher.telegramId).length).toBe(before);
    await phone(s.tg);
    const got = to(teacher.telegramId).slice(before);
    expect(got).toHaveLength(1);
    expect(got[0]?.html).toContain("<b>Anvar Toshev</b>");
    expect(got[0]?.html).toContain("+998901112233");
    expect(got[0]?.button?.url).toMatch(/\/students$/);
    await post("/me/name", s.headers, { fullName: "Anvar Toshmatov" });
    expect(to(teacher.telegramId).length).toBe(before + 1);
  });
});

describe("Ota-ona xabarlari", () => {
  it("so'rov: ustozga va o'quvchiga; tasdiq: ota-ona va o'quvchiga", async () => {
    const s = await student();
    const { code } = (
      await post("/internal/parent-code", KEY, { from: { id: s.tg, first_name: "O" } })
    ).json();
    const p = { id: tgId(), first_name: "Ota<script>" };
    tgIds.push(BigInt(p.id));
    const before = to(teacher.telegramId).length;
    await post("/internal/parent-link", KEY, {
      code,
      from: p,
      contact: { phone_number: "998977777777", user_id: p.id },
    });

    const staffMsg = to(teacher.telegramId).slice(before);
    expect(staffMsg).toHaveLength(1);
    expect(staffMsg[0]?.html).toContain("Ota&lt;script&gt;");
    expect(staffMsg[0]?.button?.url).toMatch(/\/parents$/);
    expect(to(s.telegramId).at(-1)?.html).toContain("ota-onangiz sifatida");

    const link = await prisma.parentLink.findFirstOrThrow({
      where: { parent: { telegramId: BigInt(p.id) } },
    });
    await post(`/admin/parent-links/${link.id}/approve`, teacher.headers);
    expect(to(BigInt(p.id)).at(-1)?.html).toContain("tasdiqlandingiz");
    expect(to(s.telegramId).at(-1)?.html).toContain("Ota-onangiz");
  });

  it("rad etilsa ota-onaga sabab bilan xabar", async () => {
    const s = await student();
    const { code } = (
      await post("/internal/parent-code", KEY, { from: { id: s.tg, first_name: "O" } })
    ).json();
    const p = { id: tgId(), first_name: "Ona" };
    tgIds.push(BigInt(p.id));
    await post("/internal/parent-link", KEY, {
      code,
      from: p,
      contact: { phone_number: "998977777778", user_id: p.id },
    });
    const link = await prisma.parentLink.findFirstOrThrow({
      where: { parent: { telegramId: BigInt(p.id) } },
    });
    await post(`/admin/parent-links/${link.id}/reject`, teacher.headers, { reason: "Raqam boshqa odamniki" });
    expect(to(BigInt(p.id)).at(-1)?.html).toContain("Raqam boshqa odamniki");
  });
});
