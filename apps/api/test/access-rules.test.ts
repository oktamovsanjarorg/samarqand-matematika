import { describe, expect, it } from "vitest";
import { isFullAccess, type AccessFacts } from "../src/access/access-rules";

const all: AccessFacts = { mode: "AUTO", accepted: true, approvedParents: 1, paid: true };

describe("isFullAccess", () => {
  it("BR-A04: uchala shart bajarilsa ochiq", () => expect(isFullAccess(all)).toBe(true));

  it.each([
    ["qabul qilinmagan", { accepted: false }],
    ["ota-ona tasdiqlamagan", { approvedParents: 0 }],
    ["to'lov yo'q", { paid: false }],
  ])("BR-A04: %s bo'lsa yopiq", (_name, change) => expect(isFullAccess({ ...all, ...change })).toBe(false));

  it("BR-S03: FREE shartlarsiz ochiq, CLOSED shartlar bajarilsa ham yopiq", () => {
    expect(isFullAccess({ mode: "FREE", accepted: false, approvedParents: 0, paid: false })).toBe(true);
    expect(isFullAccess({ ...all, mode: "CLOSED" })).toBe(false);
  });
});
