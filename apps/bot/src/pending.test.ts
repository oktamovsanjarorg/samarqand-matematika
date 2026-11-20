import { describe, expect, it } from "vitest";
import { createPendingStore } from "./pending";

describe("createPendingStore", () => {
  it("kodni bir marta beradi", () => {
    const s = createPendingStore();
    s.set(1, "ABCD1234");
    expect(s.take(1)).toBe("ABCD1234");
    expect(s.take(1)).toBeNull();
  });

  it("muddati o'tgan kod berilmaydi", () => {
    let t = 0;
    const s = createPendingStore(1000, () => t);
    s.set(1, "ABCD1234");
    t = 1001;
    expect(s.take(1)).toBeNull();
  });
});
