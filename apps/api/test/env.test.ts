import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

describe("loadEnv", () => {
  it("BOT_TOKEN va JWT_SECRET boʻlmasa ishga tushmaydi", () => {
    expect(() => loadEnv({})).toThrow(/BOT_TOKEN/);
  });

  it("qisqa JWT_SECRET rad etiladi", () => {
    expect(() => loadEnv({ BOT_TOKEN: "1:x", JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
  });
});
