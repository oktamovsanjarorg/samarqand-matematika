import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DailyDigest } from "../src/dashboard/daily-digest";
import { dailyDigestText } from "../src/notify/messages";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.appSetting.deleteMany({ where: { key: { startsWith: "digest:2031-" } } });
  await f.cleanup();
});

const empty = {
  newStudents: 0,
  pendingParents: 0,
  pendingPayments: 0,
  unmatchedOffline: 0,
  review: [],
  backupStaleSince: null,
};

describe("ertalabki xulosa (T-139)", () => {
  it("faqat noldan katta ishlar; hammasi 0 bo'lsa xabar yo'q", () => {
    expect(dailyDigestText(empty)).toBeNull();
    expect(
      dailyDigestText({
        ...empty,
        newStudents: 2,
        review: [
          { testId: "a", title: "1-hafta", count: 3 },
          { testId: "b", title: "2-hafta", count: 1 },
        ],
      }),
    ).toBe(
      "☀️ <b>Bugungi ishlar</b>\n\n• 2 ta yangi oʻquvchi qabulni kutmoqda\n• 4 ta yechim rasmi tekshirilmagan",
    );
  });

  it("T-145: zaxira eskirgan bo'lsa birinchi qatorda, boshqa ish bo'lmasa ham", () => {
    expect(dailyDigestText({ ...empty, backupStaleSince: "2031-03-03T22:00:00Z" })).toBe(
      "☀️ <b>Bugungi ishlar</b>\n\n⚠️ Zaxira nusxa <b>04-mart, 03:00</b> dan beri olinmagan: serverni tekshiring",
    );
  });

  it("Toshkent 08:00 dan keyin kuniga bir marta ustozga, admin tugmasi bilan", async () => {
    // Qabul kutayotgan o'quvchi: kamida bitta ish bo'lsin
    const s = await f.student();
    await f.prisma.studentProfile.update({ where: { userId: s.id }, data: { acceptedAt: null } });
    const digest = f.app.get(DailyDigest);
    // 2031-03-05 07:59 Toshkent = 02:59 UTC: hali erta
    expect(await digest.tick(new Date("2031-03-05T02:59:00Z"))).toBe(false);
    const before = f.messagesTo(f.teacherTg).length;
    expect(await digest.tick(new Date("2031-03-05T03:00:00Z"))).toBe(true);
    const sent = f.messagesTo(f.teacherTg);
    expect(sent).toHaveLength(before + 1);
    expect(sent.at(-1)).toMatch(/^☀️ <b>Bugungi ishlar<\/b>\n\n• \d+ ta yangi oʻquvchi qabulni kutmoqda/);
    expect(f.buttonsTo(f.teacherTg).at(-1)).toMatchObject({ text: "Admin panelni ochish" });
    // Shu kuni qayta (yoki ikkinchi nusxa): yuborilmaydi
    expect(await digest.tick(new Date("2031-03-05T10:00:00Z"))).toBe(false);
    expect(f.messagesTo(f.teacherTg)).toHaveLength(before + 1);
    // Ertasi kuni yana
    expect(await digest.tick(new Date("2031-03-06T04:00:00Z"))).toBe(true);
  });
});
