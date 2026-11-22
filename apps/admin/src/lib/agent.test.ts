import { describe, expect, it } from "vitest";
import { plainText } from "./agent";

describe("plainText (T-156)", () => {
  it("qalin va sarlavha belgilarini oladi, formulaga tegmaydi", () => {
    expect(plainText("## Natija\nTayyor: **Algebra** kursi, $2*3=6$")).toBe(
      "Natija\nTayyor: Algebra kursi, $2*3=6$",
    );
  });
});
