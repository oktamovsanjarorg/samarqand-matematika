import type { StaffInvite, StaffRow } from "@samarqand/shared";
import { internalKey } from "@samarqand/shared/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INVITE_KEY } from "../src/staff/staff-invite.service";
import { BOT_TOKEN, TEST_BOT_USERNAME, tgId } from "./helpers";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const fresh: number[] = [];
const KEY = { "x-internal-key": internalKey(BOT_TOKEN) };

beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.appSetting.deleteMany({ where: { key: INVITE_KEY } });
  const ids = (
    await f.prisma.user.findMany({ where: { telegramId: { in: fresh.map(BigInt) } }, select: { id: true } })
  ).map((u) => u.id);
  await f.prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  await f.prisma.user.deleteMany({ where: { id: { in: ids } } });
  await f.cleanup();
});

const use = (id: number, code: string, first_name = "Yangi") =>
  f.app.inject({
    method: "POST",
    url: "/api/internal/staff-invite",
    headers: KEY,
    payload: { from: { id, first_name, last_name: "Yordamchi" }, code },
  });
const invite = async () => (await f.call("POST", "/admin/staff/invite", f.teacher)).json() as StaffInvite;

describe("Yordamchini havola bilan taklif qilish (T-155, BR-A05)", () => {
  it("botga hech kirmagan odam havolani ochib yordamchi bo'ladi; havola bir marta ishlaydi", async () => {
    const inv = await invite();
    expect(inv.link).toBe(`https://t.me/${TEST_BOT_USERNAME}?start=s_${inv.code}`);
    expect(new Date(inv.expiresAt).getTime() - Date.now()).toBeGreaterThan(23 * f.HOUR);
    const stored = JSON.stringify(
      (await f.prisma.appSetting.findUnique({ where: { key: INVITE_KEY } }))?.value,
    );
    expect(stored).not.toContain(inv.code);

    const tg = tgId();
    fresh.push(tg);
    const res = await use(tg, inv.code);
    expect(res.json()).toEqual({ status: "ok" });
    const staff = (await f.call("GET", "/admin/staff", f.teacher)).json() as StaffRow[];
    expect(staff.find((s) => s.name === "Yangi Yordamchi")).toMatchObject({ role: "ASSISTANT" });
    expect(f.messagesTo(f.teacherTg).at(-1)).toContain(
      "<b>Yangi Yordamchi</b> taklif havolasi orqali yordamchi boʻldi",
    );

    const again = tgId();
    fresh.push(again);
    expect((await use(again, inv.code)).json()).toEqual({ status: "invalid" });
    expect((await use(tg, inv.code)).json()).toEqual({ status: "invalid" });
    const log = await f.prisma.auditLog.findMany({
      where: { action: { in: ["staff.invite", "staff.add"] } },
    });
    expect(log.map((l) => l.action)).toEqual(expect.arrayContaining(["staff.invite", "staff.add"]));
  });

  it("yangi havola eskisini bekor qiladi; bekor qilingan va muddati o'tgan havola ishlamaydi", async () => {
    const old = await invite();
    const cur = await invite();
    const tg = tgId();
    fresh.push(tg);
    expect((await use(tg, old.code)).json()).toEqual({ status: "invalid" });

    expect((await f.call("DELETE", "/admin/staff/invite", f.teacher)).statusCode).toBe(204);
    expect((await use(tg, cur.code)).json()).toEqual({ status: "invalid" });

    const late = await invite();
    await f.prisma.appSetting.update({
      where: { key: INVITE_KEY },
      data: {
        value: {
          ...((await f.prisma.appSetting.findUniqueOrThrow({ where: { key: INVITE_KEY } })).value as object),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      },
    });
    expect((await use(tg, late.code)).json()).toEqual({ status: "invalid" });
  });

  it("ustoz, yordamchi va ota-ona o'zgarmaydi, havola esa saqlanib qoladi", async () => {
    const inv = await invite();
    const p = await f.student(false);
    await f.prisma.user.update({ where: { id: p.id }, data: { role: "PARENT" } });
    expect((await use(Number(p.telegramId), inv.code)).json()).toEqual({ status: "parent" });
    expect((await use(Number(f.teacherTg), inv.code)).json()).toEqual({ status: "teacher" });
    const s = await f.student(false);
    expect((await use(Number(s.telegramId), inv.code)).json()).toEqual({ status: "ok" });
  });

  it("ruxsatlar: yordamchi va o'quvchi havola yarata olmaydi (403), tokensiz 401, kalitsiz ichki yo'l 401, noto'g'ri kod 400", async () => {
    const helper = await f.student(false);
    await f.prisma.user.update({ where: { id: helper.id }, data: { role: "ASSISTANT" } });
    expect((await f.call("POST", "/admin/staff/invite", helper.headers)).statusCode).toBe(403);
    expect((await f.call("DELETE", "/admin/staff/invite", helper.headers)).statusCode).toBe(403);
    expect((await f.call("POST", "/admin/staff/invite", (await f.student()).headers)).statusCode).toBe(403);
    expect((await f.call("POST", "/admin/staff/invite", {})).statusCode).toBe(401);
    const noKey = await f.app.inject({
      method: "POST",
      url: "/api/internal/staff-invite",
      payload: { from: { id: 1, first_name: "X" }, code: "A".repeat(22) },
    });
    expect(noKey.statusCode).toBe(401);
    expect((await use(1, "qisqa")).statusCode).toBe(400);
  });
});
