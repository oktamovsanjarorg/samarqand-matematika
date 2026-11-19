import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { internalKey } from "@samarqand/shared/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BOT_TOKEN, createApp, OWNER, tgId } from "./helpers";

const prisma = new PrismaClient();
let app: NestFastifyApplication;
const ids: bigint[] = [];

async function requestLink(
  profile: { id: number; first_name: string; username?: string },
  key = internalKey(BOT_TOKEN),
) {
  ids.push(BigInt(profile.id));
  return app.inject({
    method: "POST",
    url: "/api/internal/admin-login-link",
    headers: { "x-internal-key": key },
    payload: profile,
  });
}

const tokenOf = (url: string) => url.split("#t=")[1] ?? "";

const consume = (token: string) =>
  app.inject({ method: "POST", url: "/api/auth/admin-link", payload: { token } });

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

describe("Admin kirish havolasi (T-010)", () => {
  it("ichki kalitsiz yoki noto'g'ri kalit bilan 401", async () => {
    const res = await requestLink({ id: tgId(), first_name: "X" }, "wrong");
    expect(res.statusCode).toBe(401);
  });

  it("oʻquvchiga havola berilmaydi (url: null)", async () => {
    const res = await requestLink({ id: tgId(), first_name: "S" });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toBeNull();
  });

  it("ustoz havola oladi, token 12 soatlik JWT'ga almashadi va /api/me ishlaydi", async () => {
    const { url } = (await requestLink({ id: tgId(), first_name: "U", username: OWNER })).json();
    expect(url).toMatch(/\/admin\/login#t=/);
    const res = await consume(tokenOf(url));
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.expiresIn).toBe("12h");
    expect(body.user.role).toBe("TEACHER");
    const me = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect(me.statusCode).toBe(200);
  });

  it("token faqat bir marta ishlaydi", async () => {
    const { url } = (await requestLink({ id: tgId(), first_name: "U", username: OWNER })).json();
    expect((await consume(tokenOf(url))).statusCode).toBe(200);
    expect((await consume(tokenOf(url))).statusCode).toBe(401);
  });

  it("bir vaqtda ikki so'rov: faqat bittasi o'tadi", async () => {
    const { url } = (await requestLink({ id: tgId(), first_name: "U", username: OWNER })).json();
    const codes = (await Promise.all([consume(tokenOf(url)), consume(tokenOf(url))])).map(
      (r) => r.statusCode,
    );
    expect(codes.sort()).toEqual([200, 401]);
  });

  it("eskirgan token rad etiladi", async () => {
    const id = tgId();
    const { url } = (await requestLink({ id, first_name: "U", username: OWNER })).json();
    await prisma.loginToken.updateMany({
      where: { user: { telegramId: BigInt(id) } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await consume(tokenOf(url))).statusCode).toBe(401);
  });

  it("havola olingandan keyin bloklangan xodim kira olmaydi", async () => {
    const id = tgId();
    const { url } = (await requestLink({ id, first_name: "U", username: OWNER })).json();
    await prisma.user.update({ where: { telegramId: BigInt(id) }, data: { isBlocked: true } });
    expect((await consume(tokenOf(url))).statusCode).toBe(403);
  });

  it("muvaffaqiyatli kirish audit log'ga yoziladi", async () => {
    const id = tgId();
    const { url } = (await requestLink({ id, first_name: "U", username: OWNER })).json();
    const { user } = (await consume(tokenOf(url))).json();
    const logs = await prisma.auditLog.count({ where: { actorId: user.id, action: "admin.login" } });
    expect(logs).toBe(1);
  });

  it("noto'g'ri formatdagi token 400", async () => {
    expect((await consume("short")).statusCode).toBe(400);
  });
});
