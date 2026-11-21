import { describe, expect, it } from "vitest";
import { clock, formatStamp, timeLeft, uzToday } from "./time";

describe("haftalik test vaqti", () => {
  const now = new Date("2026-11-20T11:00:00Z");
  it("qolgan vaqt", () => {
    expect(timeLeft("2026-11-22T16:00:00Z", now)).toBe("2 kun 5 soat");
    expect(timeLeft("2026-11-21T11:00:00Z", now)).toBe("1 kun");
    expect(timeLeft("2026-11-20T14:20:00Z", now)).toBe("3 soat 20 daqiqa");
    expect(timeLeft("2026-11-20T11:15:30Z", now)).toBe("15 daqiqa");
    expect(timeLeft("2026-11-20T10:00:00Z", now)).toBe("0 daqiqa");
  });
  it("Toshkent vaqti bilan", () => {
    expect(formatStamp("2026-11-29T18:59:00Z")).toBe("29.11, 23:59");
  });
});

describe("clock", () => {
  it("BR-M06: mock teskari sanog'i", () => {
    expect(clock(3_909_000)).toBe("1:05:09");
    expect(clock(1_499_001)).toBe("25:00");
    expect(clock(7_000)).toBe("0:07");
    expect(clock(-5)).toBe("0:00");
  });
});

describe("uzToday", () => {
  it("Toshkent sanasi bo'yicha kun va oy nomi", () => {
    expect(uzToday(new Date("2026-11-21T10:00:00Z"))).toBe("Shanba, 21-noyabr");
    // UTC 20:00 — Toshkentda ertangi kun
    expect(uzToday(new Date("2026-11-21T20:00:00Z"))).toBe("Yakshanba, 22-noyabr");
  });
});
