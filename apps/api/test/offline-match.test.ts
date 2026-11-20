import { describe, expect, it } from "vitest";
import { matchRows, nameKey, type Candidate } from "../src/offline/offline-match";

const row = (name: string, phone: string | null = null, line = 2) => ({
  line,
  name,
  phone,
  scores: [1],
  total: 1,
});
const c = (id: string, name: string, phone: string | null = null, inGroup = false): Candidate => ({
  id,
  name,
  phone,
  inGroup,
});

describe("offline natijani o'quvchiga moslash (T-056)", () => {
  it("telefon ismdan ustun; apostrof va registr farqi e'tiborsiz", () => {
    expect(nameKey("  Gʻulom  O'ROLOV ")).toBe("gulom orolov");
    const r = matchRows(
      [row("Boshqa ism", "+998 90 123 45 67"), row("gʻulom orolov")],
      [c("u1", "Ali", "998901234567"), c("u2", "G'ulom Orolov")],
    );
    expect(r.map((x) => x.match)).toEqual([
      { userId: "u1", name: "Ali", by: "phone" },
      { userId: "u2", name: "G'ulom Orolov", by: "name" },
    ]);
  });

  it("noaniq ism moslanmaydi, guruh a'zosi ustun; bitta o'quvchi ikki marta olinmaydi", () => {
    const people = [c("a", "Aziz Karimov"), c("b", "Aziz Karimov")];
    expect(matchRows([row("Aziz Karimov")], people)[0]?.match).toBeNull();
    expect(
      matchRows([row("Aziz Karimov")], [...people.slice(0, 1), c("b", "Aziz Karimov", null, true)])[0]?.match
        ?.userId,
    ).toBe("b");
    const twice = matchRows([row("Vali"), row("Vali", null, 3)], [c("v", "Vali")]);
    expect(twice.map((x) => x.match?.userId ?? null)).toEqual(["v", null]);
  });
});
