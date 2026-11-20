import { describe, expect, it } from "vitest";
import { commonOf, draftOf, emptyQuestion, validationError } from "./questions";

describe("savol muharriri yordamchilari", () => {
  it("bo'sh variant uchun joyi aniq xabar", () => {
    const q = { ...emptyQuestion(), text: "2+2" };
    expect(validationError(q)).toBe("A variant: Matn kerak");
  });

  it("to'liq savol xatosiz o'tadi", () => {
    const q = draftOf("NUMERIC", { ...commonOf(emptyQuestion()), text: "2+2" });
    expect(validationError({ ...q, answer: { value: "4" } } as typeof q)).toBeNull();
  });

  it("tur almashganda matn va qiyinlik saqlanadi", () => {
    const q = draftOf("MATCHING", commonOf({ ...emptyQuestion(), text: "Moslang", difficulty: 3 }));
    expect(q).toMatchObject({ type: "MATCHING", text: "Moslang", difficulty: 3 });
    expect(validationError(q)).toBe("Chap A: Matn kerak");
  });
});
