import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.cleanup();
});

describe("o'quvchiga kirish holati xabarlari (T-081)", () => {
  it("BR-S03: qabul qilinganda keyingi qadamlar, rejim o'zgarganda bir marta xabar", async () => {
    const s = await f.student(false);
    expect((await f.call("POST", `/admin/students/${s.id}/accept`, f.teacher)).statusCode).toBe(200);
    const [accepted] = f.messagesTo(s.telegramId);
    expect(accepted).toContain("Ustoz sizni qabul qildi");
    expect(accepted).toContain("/ota");
    expect(accepted).toContain("Obuna va toʻlovlar");

    const patch = (accessMode: string) =>
      f.call("PATCH", `/admin/students/${s.id}`, f.teacher, { accessMode });
    expect((await patch("FREE")).statusCode).toBe(200);
    expect((await patch("FREE")).statusCode).toBe(200);
    expect((await patch("CLOSED")).statusCode).toBe(200);
    expect((await patch("AUTO")).statusCode).toBe(200);
    expect(f.messagesTo(s.telegramId).slice(1)).toEqual([
      expect.stringContaining("ochib berdi"),
      expect.stringContaining("kirishingiz yopildi"),
    ]);
  });

  it("to'liq kirishli o'quvchi qabul qilinsa qadamlar yozilmaydi", async () => {
    const s = await f.student();
    await f.call("POST", `/admin/students/${s.id}/accept`, f.teacher);
    expect(f.messagesTo(s.telegramId)).toEqual([
      "✅ Ustoz sizni qabul qildi. Barcha darslar va testlar ochiq.",
    ]);
  });
});
