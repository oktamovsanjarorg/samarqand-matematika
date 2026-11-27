import type { AdminStudentRow, StudentBulkResult } from "@samarqand/shared";
import { internalKey } from "@samarqand/shared/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BOT_TOKEN } from "./helpers";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const manualIds: string[] = [];
const groupIds: string[] = [];
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.user.deleteMany({ where: { id: { in: manualIds }, telegramId: null } });
  await f.prisma.group.deleteMany({ where: { id: { in: groupIds } } });
  await f.cleanup();
});

const KEY = { "x-internal-key": internalKey(BOT_TOKEN) };
/** Har ishga tushishda boshqa raqam: 93 + 7 tasodifiy raqam */
const phone9 = () => `93${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const bulk = async (text: string, groupId?: string, h = f.teacher) => {
  const res = await f.call("POST", "/admin/students/bulk", h, { text, groupId });
  const out = res.json() as StudentBulkResult;
  if (res.statusCode === 200) manualIds.push(...out.created.map((c) => c.id));
  return { res, out };
};
const sharePhone = (tg: bigint, phone: string) =>
  f.call("POST", "/internal/user-phone", KEY, {
    from: { id: Number(tg), first_name: "U" },
    contact: { phone_number: phone, user_id: Number(tg) },
  });

describe("o'quvchini qo'lda kiritish (T-186, BR-S07, BR-S01, BR-S02)", () => {
  it("ro'yxat: yaratadi, xato va takror qatorlar sabab bilan o'tkaziladi; qabul qilingan, ulanmagan", async () => {
    const [p1, p2] = [phone9(), phone9()];
    const g = (await f.call("POST", "/admin/groups", f.teacher, { name: `Qoʻlda ${p1}` })).json() as {
      id: string;
    };
    groupIds.push(g.id);
    const text = `Aziz Qoʻldaov, ${p1}\n\nLola Qoʻldaova; +998${p2}\nBitta, ${phone9()}\nTakror Odam, ${p1}`;
    const { out } = await bulk(text, g.id);
    expect(out.created.map((c) => c.phone)).toEqual([`+998${p1}`, `+998${p2}`]);
    expect(out.skipped.map((s) => [s.line, s.reason.slice(0, 12)])).toEqual([
      [4, expect.any(String)],
      [5, "Roʻyxatda ik"],
    ]);
    const again = await bulk(`Aziz Boshqa, ${p1}`);
    expect(again.out.skipped[0]?.reason).toBe("Bu telefon bilan oʻquvchi bor: Aziz Qoʻldaov");

    const rows = (
      await f.call("GET", `/admin/students?group=${g.id}`, f.teacher)
    ).json() as AdminStudentRow[];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ linked: false, groupId: g.id });
    expect(rows[0]?.acceptedAt).not.toBeNull();
    // Yangilar ro'yxatiga tushmaydi
    const news = (await f.call("GET", "/admin/students?filter=new", f.teacher)).json() as AdminStudentRow[];
    expect(news.map((r) => r.id)).not.toContain(rows[0]?.id);
  });

  it("botda raqam ulashilsa birlashadi: ism, guruh, qabul, davomat Telegram'li hisobga o'tadi", async () => {
    const p = phone9();
    const g = (await f.call("POST", "/admin/groups", f.teacher, { name: `Bogʻlash ${p}` })).json() as {
      id: string;
    };
    groupIds.push(g.id);
    const { out } = await bulk(`Sardor Bogʻlanov, ${p}`, g.id);
    const manualId = out.created[0]!.id;
    await f.call("PUT", `/admin/groups/${g.id}/attendance`, f.teacher, {
      date: "2026-11-03",
      marks: [{ userId: manualId, status: "PRESENT" }],
    });

    const s = await f.student(false);
    expect((await sharePhone(s.telegramId, `998${p}`)).json()).toEqual({ status: "saved" });
    expect(await f.prisma.user.count({ where: { id: manualId } })).toBe(0);
    const row = (await f.call("GET", `/admin/students/${s.id}`, f.teacher)).json() as {
      student: AdminStudentRow;
    };
    expect(row.student).toMatchObject({ fullName: "Sardor Bogʻlanov", groupId: g.id, linked: true });
    expect(row.student.acceptedAt).not.toBeNull();
    expect(await f.prisma.attendance.count({ where: { userId: s.id, groupId: g.id } })).toBe(1);
    const me = (await f.call("GET", "/me/profile", s.headers)).json() as { needsOnboarding: boolean };
    expect(me.needsOnboarding).toBe(false);
  });

  it("ulanmagan yozuvni ustoz o'chira oladi; ruxsat yo'q: o'quvchi kirita olmaydi", async () => {
    const { out } = await bulk(`Xato Kiritilgan, ${phone9()}`);
    const id = out.created[0]!.id;
    expect((await f.call("DELETE", `/admin/students/${id}`, f.teacher)).statusCode).toBe(204);
    const s = await f.student();
    expect(
      (await f.call("POST", "/admin/students/bulk", s.headers, { text: "A B, 931234567" })).statusCode,
    ).toBe(403);
  });
});
