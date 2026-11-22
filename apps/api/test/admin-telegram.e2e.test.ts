import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { signInitData } from "@samarqand/shared/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BOT_TOKEN, createApp, OWNER, tgId } from "./helpers";

const prisma = new PrismaClient();
let app: NestFastifyApplication;
const ids: bigint[] = [];

/** Telegram imzolagan initData; ageSec: necha soniya oldin ochilgan */
function initData(
  user: { id: number; first_name: string; username?: string },
  ageSec = 0,
  token = BOT_TOKEN,
) {
  ids.push(BigInt(user.id));
  const authDate = String(Math.floor(Date.now() / 1000) - ageSec);
  return signInitData({ auth_date: authDate, user: JSON.stringify(user) }, token);
}
const exchange = (data: string) =>
  app.inject({ method: "POST", url: "/api/auth/admin-telegram", payload: { initData: data } });

beforeAll(async () => {
  app = await createApp();
});
afterAll(async () => {
  const users = await prisma.user.findMany({ where: { telegramId: { in: ids } }, select: { id: true } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: ids } } });
  await prisma.$disconnect();
  await app.close();
});

describe("Mini App'dan admin panel (T-158)", () => {
  it("ustoz initData bilan 12 soatlik admin token oladi, panel ishlaydi, jurnalga yoziladi", async () => {
    const res = await exchange(initData({ id: tgId(), first_name: "Ustoz", username: OWNER }));
    expect(res.statusCode).toBe(200);
    const body = res.json() as { token: string; expiresIn: string; user: { id: string; role: string } };
    expect(body.user.role).toBe("TEACHER");
    expect(body.expiresIn).toBe("12h");
    const dash = await app.inject({
      method: "GET",
      url: "/api/admin/dashboard",
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect(dash.statusCode).toBe(200);
    const log = await prisma.auditLog.findFirst({ where: { actorId: body.user.id, action: "admin.login" } });
    expect(log?.data).toEqual({ via: "miniapp" });
  });

  it("o'quvchiga 403 (admin token berilmaydi)", async () => {
    const res = await exchange(initData({ id: tgId(), first_name: "Oquvchi" }));
    expect(res.statusCode).toBe(403);
    expect(JSON.stringify(res.json())).not.toContain("token");
  });

  it("1 soatdan eski, soxta imzoli yoki bo'sh initData 401/400", async () => {
    const owner = { id: tgId(), first_name: "Ustoz", username: OWNER };
    expect((await exchange(initData(owner, 2 * 3600))).statusCode).toBe(401);
    expect((await exchange(initData(owner, 0, "123456:soxta-bot-token-soxta-bot-token"))).statusCode).toBe(
      401,
    );
    expect((await exchange("")).statusCode).toBe(400);
    // 50 daqiqalik hali o'tadi
    expect((await exchange(initData(owner, 50 * 60))).statusCode).toBe(200);
  });

  it("bloklangan xodimga 403", async () => {
    const id = tgId();
    await exchange(initData({ id, first_name: "Ustoz", username: OWNER }));
    await prisma.user.update({ where: { telegramId: BigInt(id) }, data: { isBlocked: true } });
    expect((await exchange(initData({ id, first_name: "Ustoz", username: OWNER }))).statusCode).toBe(403);
  });
});
