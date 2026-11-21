import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SubscriptionReminders } from "../src/billing/subscription-reminders";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
let planId: string;
const DAY = 86_400_000;

beforeAll(async () => {
  f = await weeklyFixture();
  planId = (
    await f.prisma.plan.create({ data: { name: `Eslatma ${Date.now()}`, priceUzs: 1, durationDays: 30 } })
  ).id;
});
afterAll(async () => {
  await f.cleanup();
  await f.prisma.plan.delete({ where: { id: planId } });
});

const now = new Date();
const tick = (at = now) => f.app.get(SubscriptionReminders).tick(at);
const sub = (userId: string, endsInMs: number, reminderStage = 0) =>
  f.prisma.subscription.create({
    data: {
      userId,
      planId,
      startsAt: new Date(now.getTime() + endsInMs - 30 * DAY),
      endsAt: new Date(now.getTime() + endsInMs),
      reminderStage,
    },
  });

async function parentOf(childId: string) {
  const p = await f.student(false);
  await f.prisma.user.update({ where: { id: p.id }, data: { role: "PARENT" } });
  const child = await f.prisma.studentProfile.upsert({
    where: { userId: childId },
    update: { fullName: "Obuna Egasi" },
    create: { userId: childId, fullName: "Obuna Egasi" },
  });
  await f.prisma.parentLink.create({
    data: { parentId: p.id, studentId: child.id, status: "APPROVED", phone: "998900000000" },
  });
  return p;
}

describe("Obuna tugashi eslatmasi (T-090)", () => {
  it("BR-B06: 3 kun qolganda o'quvchi va ota-onaga bir marta, tugaganda o'quvchiga", async () => {
    const s = await f.student(false);
    const p = await parentOf(s.id);
    await sub(s.id, 2 * DAY);
    await tick();
    await tick();
    expect(f.messagesTo(s.telegramId)).toEqual([expect.stringContaining("da tugaydi")]);
    expect(f.buttonsTo(s.telegramId)[0]).toMatchObject({ url: "https://miniapp.test/billing", webApp: true });
    expect(f.messagesTo(p.telegramId)).toEqual([expect.stringContaining("<b>Obuna Egasi</b>ning obunasi")]);
    // T-122: ota-onaga farzandning to'lov sahifasiga tugma
    const { id: studentId } = await f.prisma.studentProfile.findUniqueOrThrow({
      where: { userId: s.id },
      select: { id: true },
    });
    expect(f.buttonsTo(p.telegramId)[0]).toMatchObject({
      text: "Obunani toʻlash",
      url: `https://miniapp.test/children/${studentId}/billing`,
      webApp: true,
    });

    await tick(new Date(now.getTime() + 2 * DAY + 60_000));
    await tick(new Date(now.getTime() + 2 * DAY + 120_000));
    expect(f.messagesTo(s.telegramId)[1]).toContain("Obunangiz tugadi");
    expect(f.messagesTo(s.telegramId)).toHaveLength(2);
    expect(f.messagesTo(p.telegramId)).toHaveLength(1);
  });

  it("BR-B06: uzaytirilgan obuna, tekshirilayotgan chek va FREE rejimda eslatma yo'q", async () => {
    const renewed = await f.student(false);
    await sub(renewed.id, 2 * DAY);
    await sub(renewed.id, 32 * DAY);

    const pending = await f.student(false);
    await sub(pending.id, DAY);
    await f.prisma.payment.create({ data: { userId: pending.id, planId, amountUzs: 1 } });

    const free = await f.student(true);
    await sub(free.id, DAY);

    await tick();
    for (const u of [renewed, pending, free]) expect(f.messagesTo(u.telegramId)).toEqual([]);
  });

  it("bir kundan oldin tugagan obuna uchun xabar ketmaydi", async () => {
    const s = await f.student(false);
    await sub(s.id, -2 * DAY, 1);
    await tick();
    expect(f.messagesTo(s.telegramId)).toEqual([]);
  });
});
