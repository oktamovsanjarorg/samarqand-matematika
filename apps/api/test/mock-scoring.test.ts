import { RASCH_MIN_SAMPLE } from "@samarqand/math";
import { describe, expect, it } from "vitest";
import { scoreMock, type ScoredAttempt } from "../src/mock/mock-scoring";

const template = {
  name: "Sinov",
  durationMin: 60,
  scaleMax: 75,
  sections: [{ title: "Yopiq", types: ["SINGLE" as const], count: 4, points: 1 }],
  grades: [],
};

/** i-o'quvchi birinchi (i mod 5) savolni to'g'ri yechgan: qiyinliklar har xil chiqadi */
const attempt = (i: number, staff = false): ScoredAttempt => {
  const row = [0, 1, 2, 3].map((q) => (q < i % 5 ? 1 : 0) as 0 | 1);
  return { id: `${staff ? "x" : "s"}${i}`, raw: row.reduce<number>((a, b) => a + b, 0), row, staff };
};

describe("Mock shkala balli va xodim sinovi (T-087)", () => {
  it("BR-M05: xodim urinishi namuna soniga kirmaydi, lekin ball oladi", () => {
    const students = Array.from({ length: RASCH_MIN_SAMPLE - 1 }, (_, i) => attempt(i));
    const staff = Array.from({ length: 5 }, (_, i) => attempt(i + 100, true));
    const s = scoreMock(template, [...students, ...staff]);
    expect(s.raschN).toBeNull();
    expect(s.scaled.size).toBe(students.length + staff.length);
  });

  it("BR-M05: Rasch faqat o'quvchilar bo'yicha kalibrlanadi; xodim ham shu shkalada baholanadi", () => {
    const students = Array.from({ length: RASCH_MIN_SAMPLE + 5 }, (_, i) => attempt(i));
    const alone = scoreMock(template, students);
    const withStaff = scoreMock(template, [
      ...students,
      attempt(4, true),
      attempt(4, true),
      attempt(0, true),
    ]);
    expect(withStaff.raschN).toBe(students.length);
    expect(withStaff.b).toEqual(alone.b);
    expect(withStaff.scaled.get("x4")).toBe(alone.scaled.get("s4"));
  });
});
