import { describe, expect, it } from "vitest";
import { nextPeriod } from "../src/billing/period";
import { sniffImage } from "../src/storage/media-store";

describe("BR-B03: obuna davri", () => {
  const now = new Date("2026-11-20T10:00:00Z");
  it("obuna yo'q yoki tugagan bo'lsa hozirdan", () => {
    expect(nextPeriod(now, null, 30)).toEqual({ startsAt: now, endsAt: new Date("2026-12-20T10:00:00Z") });
    expect(nextPeriod(now, new Date("2026-11-01T00:00:00Z"), 1).startsAt).toEqual(now);
  });
  it("faol obuna oxiridan davom etadi", () => {
    const end = new Date("2026-11-25T00:00:00Z");
    expect(nextPeriod(now, end, 30)).toEqual({ startsAt: end, endsAt: new Date("2026-12-25T00:00:00Z") });
  });
});

describe("BR-B02: chek rasmi baytlardan aniqlanadi", () => {
  it("jpg, png, webp va boshqa", () => {
    expect(sniffImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(20)]))?.ext).toBe("jpg");
    expect(
      sniffImage(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(20)]))?.ext,
    ).toBe("png");
    expect(sniffImage(Buffer.concat([Buffer.from("RIFF0000WEBP"), Buffer.alloc(20)]))?.ext).toBe("webp");
    expect(sniffImage(Buffer.from("<svg onload=alert(1)>............"))).toBeNull();
  });
});
