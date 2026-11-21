import type { AttendanceMonth, AttendanceSheet } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const groupIds: string[] = [];
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.group.deleteMany({ where: { id: { in: groupIds } } });
  await f.cleanup();
});

async function parentOf(child: { id: string }, status: "APPROVED" | "PENDING" = "APPROVED") {
  const p = await f.student(false);
  await f.prisma.user.update({ where: { id: p.id }, data: { role: "PARENT" } });
  const profile = await f.prisma.studentProfile.findUniqueOrThrow({
    where: { userId: child.id },
    select: { id: true },
  });
  await f.prisma.parentLink.create({
    data: { parentId: p.id, studentId: profile.id, status, phone: "998900000000" },
  });
  return p;
}

async function groupWith(...students: { id: string }[]) {
  const id = (await f.call("POST", "/admin/groups", f.teacher, { name: "Davomat guruhi" })).json()
    .id as string;
  groupIds.push(id);
  await f.call("POST", `/admin/groups/${id}/students`, f.teacher, { userIds: students.map((s) => s.id) });
  return id;
}

const DATE = "2026-11-02";
const put = (g: string, marks: { userId: string; status: string; note?: string }[], date = DATE) =>
  f.call("PUT", `/admin/groups/${g}/attendance`, f.teacher, { date, marks });

describe("davomat (T-055, BR-G02, BR-G03)", () => {
  it("BR-G03: kelmagan va kechikkanning tasdiqlangan ota-onasiga xabar; kelganga yo'q; tuzatish bir marta", async () => {
    const [a, b, c] = [await f.student(), await f.student(), await f.student()];
    await f.prisma.studentProfile.update({ where: { userId: a.id }, data: { fullName: "Davomat Anvar" } });
    const g = await groupWith(a, b, c);
    const [pa, pb, pc] = [await parentOf(a), await parentOf(b), await parentOf(c)];
    const pending = await parentOf(a, "PENDING");

    const res = await put(g, [
      { userId: a.id, status: "ABSENT" },
      { userId: b.id, status: "LATE", note: "10 daqiqa" },
      { userId: c.id, status: "PRESENT" },
    ]);
    expect(res.statusCode).toBe(200);
    const sheet = res.json() as AttendanceSheet;
    expect(sheet.rows.find((r) => r.userId === b.id)).toMatchObject({ status: "LATE", note: "10 daqiqa" });
    expect(f.messagesTo(pa.telegramId)).toEqual([
      expect.stringContaining("<b>Davomat Anvar</b> 02.11.2026 kuni darsga kelmadi"),
    ]);
    expect(f.messagesTo(pb.telegramId)).toEqual([expect.stringContaining("darsga kechikdi")]);
    expect(f.messagesTo(pc.telegramId)).toEqual([]);
    expect(f.messagesTo(pending.telegramId)).toEqual([]);

    // Qayta saqlash: holat o'zgarmasa xabar takrorlanmaydi; xato tuzatilsa "Tuzatish"
    await put(g, [{ userId: a.id, status: "ABSENT" }]);
    expect(f.messagesTo(pa.telegramId)).toHaveLength(1);
    await put(g, [{ userId: a.id, status: "PRESENT" }]);
    expect(f.messagesTo(pa.telegramId)[1]).toContain(
      "Tuzatish: <b>Davomat Anvar</b> 02.11.2026 kuni darsga keldi",
    );
    const got = (
      await f.call("GET", `/admin/groups/${g}/attendance?date=${DATE}`, f.teacher)
    ).json() as AttendanceSheet;
    expect(got.rows.map((r) => r.status).sort()).toEqual(["LATE", "PRESENT", "PRESENT"]);
    // Izohsiz qayta belgilash izohni o'chirmaydi
    await put(g, [{ userId: b.id, status: "LATE" }]);
    const again = (
      await f.call("GET", `/admin/groups/${g}/attendance?date=${DATE}`, f.teacher)
    ).json() as AttendanceSheet;
    expect(again.rows.find((r) => r.userId === b.id)?.note).toBe("10 daqiqa");
  });

  it("BR-G02: guruhda bo'lmagan o'quvchi, kelajak sanasi va noto'g'ri sana 400; o'quvchiga 403", async () => {
    const [a, other] = [await f.student(), await f.student()];
    const g = await groupWith(a);
    expect((await put(g, [{ userId: other.id, status: "ABSENT" }])).statusCode).toBe(400);
    expect((await put(g, [{ userId: a.id, status: "ABSENT" }], "2099-01-01")).statusCode).toBe(400);
    expect((await f.call("GET", `/admin/groups/${g}/attendance?date=bugun`, f.teacher)).statusCode).toBe(400);
    const empty = (
      await f.call("GET", `/admin/groups/${g}/attendance?date=${DATE}`, f.teacher)
    ).json() as AttendanceSheet;
    expect(empty.rows).toEqual([expect.objectContaining({ userId: a.id, status: null })]);
    expect(
      (await f.call("PUT", `/admin/groups/${g}/attendance`, a.headers, { date: DATE, marks: [] })).statusCode,
    ).toBe(403);
    expect((await f.call("GET", `/admin/groups/${g}/attendance?date=${DATE}`, a.headers)).statusCode).toBe(
      403,
    );
  });
});

describe("oylik davomat (T-108)", () => {
  it("o'quvchi × kun jadvali, jami sonlar; guruhdan chiqqan ham ko'rinadi; boshqa oy kirmaydi", async () => {
    const [a, b] = [await f.student(), await f.student()];
    await f.prisma.studentProfile.update({ where: { userId: a.id }, data: { fullName: "Oylik Aziz" } });
    const g = await groupWith(a, b);
    await put(g, [
      { userId: a.id, status: "PRESENT" },
      { userId: b.id, status: "ABSENT" },
    ]);
    await put(g, [{ userId: a.id, status: "LATE" }], "2026-11-05");
    await put(g, [{ userId: a.id, status: "ABSENT" }], "2026-10-30");
    await f.call("DELETE", `/admin/groups/${g}/students/${b.id}`, f.teacher);

    const res = await f.call("GET", `/admin/groups/${g}/attendance/month?month=2026-11`, f.teacher);
    expect(res.statusCode).toBe(200);
    const m = res.json() as AttendanceMonth;
    expect(m.dates).toEqual(["2026-11-02", "2026-11-05"]);
    expect(m.rows.map((r) => [r.userId, r.left])).toEqual([
      [a.id, false],
      [b.id, true],
    ]);
    expect(m.rows[0]).toMatchObject({
      name: "Oylik Aziz",
      marks: { "2026-11-02": "PRESENT", "2026-11-05": "LATE" },
      counts: { PRESENT: 1, LATE: 1, ABSENT: 0, EXCUSED: 0 },
    });
    expect(m.rows[1]?.counts.ABSENT).toBe(1);
  });

  it("noto'g'ri oy 400, yo'q guruh 404, o'quvchiga 403, tokensiz 401", async () => {
    const g = await groupWith();
    const url = (q: string, id = g) => `/admin/groups/${id}/attendance/month?month=${q}`;
    expect((await f.call("GET", url("2026-13"), f.teacher)).statusCode).toBe(400);
    expect((await f.call("GET", url("2026-11", "yoq"), f.teacher)).statusCode).toBe(404);
    const s = await f.student();
    expect((await f.call("GET", url("2026-11"), s.headers)).statusCode).toBe(403);
    expect((await f.call("GET", url("2026-11"), {})).statusCode).toBe(401);
  });
});
