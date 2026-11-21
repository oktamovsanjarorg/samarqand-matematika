import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

describe("loadEnv", () => {
  it("BOT_TOKEN va JWT_SECRET boʻlmasa ishga tushmaydi", () => {
    expect(() => loadEnv({})).toThrow(/BOT_TOKEN/);
  });

  it("qisqa JWT_SECRET rad etiladi", () => {
    expect(() => loadEnv({ BOT_TOKEN: "1:x", JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
  });

  it("T-092: bot xabarlari standart holda Telegram'ga, off bo'lsa hech qayerga; boshqa qiymat rad etiladi", () => {
    const base = { BOT_TOKEN: "1:x", JWT_SECRET: "0123456789abcdef" };
    expect(loadEnv(base).NOTIFY_TRANSPORT).toBe("telegram");
    expect(loadEnv({ ...base, NOTIFY_TRANSPORT: "off" }).NOTIFY_TRANSPORT).toBe("off");
    expect(() => loadEnv({ ...base, NOTIFY_TRANSPORT: "log" })).toThrow(/NOTIFY_TRANSPORT/);
  });
});
