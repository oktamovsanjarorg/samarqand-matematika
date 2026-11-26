import { describe, expect, it } from "vitest";
import { offlineImportInput, phoneKey } from "./offline";

describe("offline import (T-181, BR-G04)", () => {
  it("phoneKey: oxirgi 9 raqam", () => {
    expect(phoneKey("+998 (90) 123-45-67")).toBe("901234567");
    expect(phoneKey("901234567")).toBe("901234567");
    expect(phoneKey("12345")).toBeNull();
  });

  it("BR-G04: fan bo'limida bir savol ikki marta bo'lmaydi", () => {
    const base = { csv: "x", title: "Mock", date: "2026-11-20" };
    expect(offlineImportInput.safeParse({ ...base, sections: [] }).success).toBe(true);
    const bad = offlineImportInput.safeParse({
      ...base,
      sections: [
        { title: "A", questions: [1, 2] },
        { title: "B", questions: [2] },
      ],
    });
    expect(bad.success).toBe(false);
  });
});
