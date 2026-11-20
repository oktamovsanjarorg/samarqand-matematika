import { describe, expect, it } from "vitest";
import {
  approxScaled,
  examMaxRaw,
  examQuestionCount,
  examTemplateInput,
  gradeOf,
  MILLIY_PRESET,
} from "./exam";

describe("imtihon shabloni (BR-M01)", () => {
  it("Milliy taklifi to'g'ri shablon: 45 savol, ~100 xom ball", () => {
    expect(examTemplateInput.safeParse(MILLIY_PRESET).success).toBe(true);
    expect(examQuestionCount(MILLIY_PRESET.sections)).toBe(45);
    expect(examMaxRaw(MILLIY_PRESET.sections)).toBe(100.5);
  });

  it("darajalar kamayish tartibida va shkaladan oshmaydi", () => {
    const bad = {
      ...MILLIY_PRESET,
      grades: [
        { label: "A", min: 60 },
        { label: "B", min: 65 },
      ],
    };
    expect(examTemplateInput.safeParse(bad).success).toBe(false);
    const over = { ...MILLIY_PRESET, grades: [{ label: "A", min: 80 }] };
    expect(examTemplateInput.safeParse(over).success).toBe(false);
  });

  it("BR-M02: daraja chegarasi bilan teng ball shu darajani oladi, 46 dan past darajasiz", () => {
    expect(gradeOf(70, MILLIY_PRESET.grades)).toBe("A+");
    expect(gradeOf(69.9, MILLIY_PRESET.grades)).toBe("A");
    expect(gradeOf(46, MILLIY_PRESET.grades)).toBe("C");
    expect(gradeOf(45.9, MILLIY_PRESET.grades)).toBeNull();
  });

  it("BR-M05: taxminiy ball xom ball ulushidan", () => {
    expect(approxScaled(100.5, 100.5, 75)).toBe(75);
    expect(approxScaled(50, 100, 75)).toBe(37.5);
    expect(approxScaled(0, 0, 75)).toBe(0);
  });
});
