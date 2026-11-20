import { describe, expect, it } from "vitest";
import { nextWeekWindow, weeklyStatus, weeklyTestInput } from "./weekly";

describe("BR-W01: haftalik oyna", () => {
  it("keyingi dushanba 00:00 dan yakshanba 23:59 gacha (Toshkent)", () => {
    // 2026-11-20 juma, 16:00 Toshkent
    const w = nextWeekWindow(new Date("2026-11-20T11:00:00Z"));
    expect(w.opensAt.toISOString()).toBe("2026-11-22T19:00:00.000Z"); // 23-noyabr dushanba 00:00 +05
    expect(w.closesAt.toISOString()).toBe("2026-11-29T18:59:00.000Z"); // 29-noyabr yakshanba 23:59 +05
  });

  it("dushanba kuni ham keyingi haftani beradi", () => {
    const w = nextWeekWindow(new Date("2026-11-23T05:00:00Z")); // dushanba 10:00 Toshkent
    expect(w.opensAt.toISOString()).toBe("2026-11-29T19:00:00.000Z");
  });

  it("holat vaqtdan", () => {
    const o = new Date("2026-11-23T00:00:00Z");
    const c = new Date("2026-11-30T00:00:00Z");
    expect(weeklyStatus(new Date("2026-11-22T00:00:00Z"), o, c)).toBe("UPCOMING");
    expect(weeklyStatus(o, o, c)).toBe("OPEN");
    expect(weeklyStatus(c, o, c)).toBe("CLOSED");
  });

  it("sxema: yopilish ochilishdan keyin, savollar takrorlanmaydi", () => {
    const base = {
      title: "1-hafta",
      opensAt: "2026-11-23T00:00:00+05:00",
      closesAt: "2026-11-29T23:59:00+05:00",
      questionIds: ["a"],
    };
    expect(weeklyTestInput.safeParse(base).success).toBe(true);
    expect(weeklyTestInput.safeParse({ ...base, closesAt: base.opensAt }).success).toBe(false);
    expect(weeklyTestInput.safeParse({ ...base, questionIds: ["a", "a"] }).success).toBe(false);
  });
});
