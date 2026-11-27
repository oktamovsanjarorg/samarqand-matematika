import { Controller, Get } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Roles } from "../src/auth/decorators";
import { loadEnv } from "../src/config/env";
import { createApp, initData, OWNER, OWNER_ID, tgId } from "./helpers";

@Controller("test-teacher-only")
class TeacherOnlyController {
  @Roles("TEACHER")
  @Get()
  ok() {
    return { ok: true };
  }
}

const prisma = new PrismaClient();
let app: NestFastifyApplication;
const ids: bigint[] = [];

async function login(user: { id: number; first_name: string; username?: string }) {
  ids.push(BigInt(user.id));
  return app.inject({ method: "POST", url: "/api/auth/telegram", payload: { initData: initData(user) } });
}

beforeAll(async () => {
  app = await createApp([TeacherOnlyController]);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { telegramId: { in: ids } } });
  await prisma.$disconnect();
  await app.close();
});

describe("POST /api/auth/telegram", () => {
  it("yaroqli initData bilan yangi oʻquvchi yaratiladi va token beriladi", async () => {
    const res = await login({ id: tgId(), first_name: "Ali" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toMatchObject({ firstName: "Ali", role: "STUDENT" });
    // T-189: profil shu javobda, ilova /me/profile ni kutmaydi
    expect(body.profile).toMatchObject({ fullName: null, needsOnboarding: true, hasPhone: false });
  });

  it("boshqa bot tokeni bilan imzolangan initData rad etiladi", async () => {
    const payload = { initData: initData({ id: tgId(), first_name: "X" }, "999:OTHER") };
    const res = await app.inject({ method: "POST", url: "/api/auth/telegram", payload });
    expect(res.statusCode).toBe(401);
  });

  it("initData yo'q bo'lsa 400", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/telegram", payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it("OWNER_USERNAMES dagi foydalanuvchi TEACHER boʻladi", async () => {
    const res = await login({ id: tgId(), first_name: "Ustoz", username: OWNER });
    expect(res.json().user.role).toBe("TEACHER");
    // T-189: xodimga profil qo'shilmaydi (admin panelga o'tadi)
    expect(res.json().profile).toBeUndefined();
  });

  it("OWNER_TELEGRAM_IDS dagi foydalanuvchi username'siz ham TEACHER boʻladi", async () => {
    const res = await login({ id: OWNER_ID, first_name: "Ustoz" });
    expect(res.json().user.role).toBe("TEACHER");
    await prisma.user.delete({ where: { telegramId: BigInt(OWNER_ID) } });
  });

  it("OWNER_TELEGRAM_IDS: raqam bo'lmasa ishga tushmaydi", () => {
    expect(() =>
      loadEnv({ BOT_TOKEN: "1:x", JWT_SECRET: "0123456789abcdef", OWNER_TELEGRAM_IDS: "12,@ustoz" }),
    ).toThrow();
  });

  it("bloklangan foydalanuvchi kira olmaydi", async () => {
    const id = tgId();
    await login({ id, first_name: "B" });
    await prisma.user.update({ where: { telegramId: BigInt(id) }, data: { isBlocked: true } });
    const res = await login({ id, first_name: "B" });
    expect(res.statusCode).toBe(401);
  });
});

describe("RBAC", () => {
  it("tokensiz yopiq endpoint 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/me" });
    expect(res.statusCode).toBe(401);
  });

  it("oʻquvchi /api/me ni oladi, lekin TEACHER endpoint'iga 403", async () => {
    const { token } = (await login({ id: tgId(), first_name: "S" })).json();
    const headers = { authorization: `Bearer ${token}` };
    expect((await app.inject({ method: "GET", url: "/api/me", headers })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/test-teacher-only", headers })).statusCode).toBe(
      403,
    );
  });

  it("ustoz TEACHER endpoint'iga kiradi", async () => {
    const { token } = (await login({ id: tgId(), first_name: "U", username: OWNER })).json();
    const res = await app.inject({
      method: "GET",
      url: "/api/test-teacher-only",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it("health ochiq", async () => {
    expect((await app.inject({ method: "GET", url: "/api/health" })).statusCode).toBe(200);
  });
});
