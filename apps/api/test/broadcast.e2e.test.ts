import type { BroadcastLogRow, BroadcastResult } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
let groupId: string;
beforeAll(async () => {
  f = await weeklyFixture();
  groupId = (await f.prisma.group.create({ data: { name: "Eʼlon guruhi" } })).id;
});
afterAll(async () => {
  await f.prisma.auditLog.deleteMany({ where: { action: "broadcast.send", entityId: groupId } });
  await f.prisma.group.delete({ where: { id: groupId } });
  await f.cleanup();
});

/** Guruhdagi o'quvchi: accepted=false bo'lsa ustoz hali qabul qilmagan */
async function member(accepted = true) {
  const s = await f.student();
  await f.prisma.studentProfile.update({
    where: { userId: s.id },
    data: { groupId, acceptedAt: accepted ? new Date() : null },
  });
  return s;
}

async function parentOf(child: { id: string }, status: "APPROVED" | "PENDING") {
  const p = await f.student(false);
  await f.prisma.user.update({ where: { id: p.id }, data: { role: "PARENT" } });
  const { id: studentId } = await f.prisma.studentProfile.findUniqueOrThrow({
    where: { userId: child.id },
    select: { id: true },
  });
  await f.prisma.parentLink.create({ data: { parentId: p.id, studentId, status, phone: "998900000003" } });
  return p;
}

const send = (body: object, headers: Record<string, string> = f.teacher) =>
  f.call("POST", "/admin/broadcast", headers, body);

describe("ustozdan eʼlon (T-116)", () => {
  it("guruhdagi qabul qilingan o'quvchilar va tasdiqlangan ota-onalarga; matn HTML emas; jurnalda", async () => {
    const [a, b, fresh, blocked] = [await member(), await member(), await member(false), await member()];
    await f.prisma.user.update({ where: { id: blocked.id }, data: { isBlocked: true } });
    const [pa, pending] = [await parentOf(a, "APPROVED"), await parentOf(b, "PENDING")];
    const body = { text: "Ertaga dars <b>yoʻq</b>", groupId };

    const dry = (await send({ ...body, audience: "all", dryRun: true })).json() as BroadcastResult;
    expect(dry).toEqual({ recipients: 3, sent: 0 });
    expect(f.messagesTo(a.telegramId)).toEqual([]);
    expect(
      ((await send({ ...body, audience: "parents", dryRun: true })).json() as BroadcastResult).recipients,
    ).toBe(1);

    const res = await send({ ...body, audience: "all", dryRun: false });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ recipients: 3, sent: 3 });
    expect(f.messagesTo(a.telegramId)).toEqual([
      "📢 <b>Ustozdan eʼlon</b>\n\nErtaga dars &lt;b&gt;yoʻq&lt;/b&gt;",
    ]);
    expect(f.messagesTo(b.telegramId)).toHaveLength(1);
    expect(f.messagesTo(pa.telegramId)).toHaveLength(1);
    for (const u of [fresh, blocked, pending]) expect(f.messagesTo(u.telegramId)).toEqual([]);

    const log = await f.prisma.auditLog.findFirstOrThrow({
      where: { action: "broadcast.send", entityId: groupId },
    });
    expect(log.data).toMatchObject({ audience: "all", recipients: 3, sent: 3, text: body.text });
  });

  it("T-117: tarixda oxirgi eʼlon birinchi, guruh nomi bilan; faqat ustozga", async () => {
    const list = await f.call("GET", "/admin/broadcast", f.teacher);
    expect(list.statusCode).toBe(200);
    const [last] = list.json() as BroadcastLogRow[];
    expect(last).toMatchObject({
      audience: "all",
      groupName: "Eʼlon guruhi",
      recipients: 3,
      sent: 3,
      text: "Ertaga dars <b>yoʻq</b>",
    });
    const helper = await f.student(false);
    await f.prisma.user.update({ where: { id: helper.id }, data: { role: "ASSISTANT" } });
    expect((await f.call("GET", "/admin/broadcast", helper.headers)).statusCode).toBe(403);
    expect((await f.call("GET", "/admin/broadcast", {})).statusCode).toBe(401);
  });

  it("T-130: appButton bo'lsa xabar ostida Mini App tugmasi, bo'lmasa tugmasiz", async () => {
    const s = await member();
    const body = { text: "Yangi test ochildi", audience: "students", groupId, dryRun: false };
    await send({ ...body, appButton: true });
    expect(f.buttonsTo(s.telegramId).at(-1)).toMatchObject({ text: "📐 Ilovani ochish", webApp: true });
    await send(body);
    expect(f.buttonsTo(s.telegramId).at(-1)).toBeUndefined();
  });

  it("T-137: unlinked faqat tasdiqlangan ota-onasi yo'q o'quvchilarga, ota-onalarga emas", async () => {
    const g = (await f.prisma.group.create({ data: { name: "Ulanmagan guruhi" } })).id;
    const inGroup = async () => {
      const s = await f.student();
      await f.prisma.studentProfile.update({
        where: { userId: s.id },
        data: { groupId: g, acceptedAt: new Date() },
      });
      return s;
    };
    try {
      const [linked, pendingOnly, alone] = [await inGroup(), await inGroup(), await inGroup()];
      const pa = await parentOf(linked, "APPROVED");
      await parentOf(pendingOnly, "PENDING");
      const res = await send({
        text: "Ota-onangizni ulang",
        audience: "unlinked",
        groupId: g,
        dryRun: false,
      });
      expect(res.json()).toEqual({ recipients: 2, sent: 2 });
      expect(f.messagesTo(pendingOnly.telegramId)).toHaveLength(1);
      expect(f.messagesTo(alone.telegramId)).toHaveLength(1);
      for (const u of [linked, pa]) expect(f.messagesTo(u.telegramId)).toEqual([]);
    } finally {
      await f.prisma.auditLog.deleteMany({ where: { action: "broadcast.send", entityId: g } });
      await f.prisma.studentProfile.updateMany({ where: { groupId: g }, data: { groupId: null } });
      await f.prisma.group.delete({ where: { id: g } });
    }
  });

  it("bo'sh matn 400, yo'q guruh 404, yordamchi va o'quvchiga 403, tokensiz 401", async () => {
    const ok = { text: "Salom", audience: "students", groupId: null, dryRun: true };
    expect((await send({ ...ok, text: "  " })).statusCode).toBe(400);
    expect((await send({ ...ok, audience: "hamma" })).statusCode).toBe(400);
    expect((await send({ ...ok, groupId: "yoq" })).statusCode).toBe(404);
    const helper = await f.student(false);
    await f.prisma.user.update({ where: { id: helper.id }, data: { role: "ASSISTANT" } });
    expect((await send(ok, helper.headers)).statusCode).toBe(403);
    expect((await send(ok, (await f.student()).headers)).statusCode).toBe(403);
    expect((await send(ok, {})).statusCode).toBe(401);
  });
});
