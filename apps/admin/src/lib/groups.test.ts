import { describe, expect, it } from "vitest";
import { tashkentToday } from "./groups";

describe("tashkentToday", () => {
  it("UTC kechqurun Toshkentda ertangi kun", () => {
    expect(tashkentToday(new Date("2026-11-20T19:30:00Z"))).toBe("2026-11-21");
    expect(tashkentToday(new Date("2026-11-20T18:59:00Z"))).toBe("2026-11-20");
  });
});
