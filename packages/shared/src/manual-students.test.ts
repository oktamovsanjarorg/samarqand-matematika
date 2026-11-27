import { describe, expect, it } from "vitest";
import { normUzPhone, parseStudentLine } from "./manual-students";

describe("o'quvchini qo'lda kiritish qatori (T-186, BR-S01)", () => {
  it("telefon: 9 raqam yoki 998 bilan", () => {
    expect(normUzPhone("90 123 45 67")).toBe("+998901234567");
    expect(normUzPhone("+998 (90) 123-45-67")).toBe("+998901234567");
    expect(normUzPhone("12345")).toBeNull();
    expect(normUzPhone("7 901 234 56 78")).toBeNull();
  });

  it("ism va telefon, ajratuvchi vergul, nuqtali vergul yoki tab; tartib muhim emas", () => {
    expect(parseStudentLine("Aziz Karimov, 90 123 45 67")).toEqual({
      fullName: "Aziz Karimov",
      phone: "+998901234567",
    });
    expect(parseStudentLine("+998901234567;  Gʻulom   Toshev")).toEqual({
      fullName: "Gʻulom Toshev",
      phone: "+998901234567",
    });
    expect(parseStudentLine("Lola Ergasheva\t901234567")).toMatchObject({ fullName: "Lola Ergasheva" });
  });

  it("BR-S01: xatolar sabab bilan", () => {
    expect(parseStudentLine("Aziz Karimov")).toEqual({ error: "Telefon yoʻq" });
    expect(parseStudentLine("Aziz, 901234567")).toHaveProperty("error");
    expect(parseStudentLine("Aziz Karimov, 12345")).toHaveProperty("error");
  });
});
