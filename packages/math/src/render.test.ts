import { describe, expect, it } from "vitest";
import { hasMath, renderMathText } from "./render";
import { splitMath } from "./segments";

describe("splitMath", () => {
  it("inline va display formulalarni ajratadi", () => {
    expect(splitMath("Agar $x^2=4$ bo'lsa: $$x=\\pm 2$$")).toEqual([
      { kind: "text", value: "Agar " },
      { kind: "inline", value: "x^2=4" },
      { kind: "text", value: " bo'lsa: " },
      { kind: "display", value: "x=\\pm 2" },
    ]);
  });

  it("\\$ dollar belgisi bo'lib qoladi", () => {
    expect(splitMath("Narxi 5\\$ va $a$")).toEqual([
      { kind: "text", value: "Narxi 5$ va " },
      { kind: "inline", value: "a" },
    ]);
  });

  it("yopilmagan $ oddiy matn", () => {
    expect(splitMath("5$ bo'ldi")).toEqual([{ kind: "text", value: "5$ bo'ldi" }]);
  });

  it("bo'sh $$ formula emas", () => {
    expect(hasMath("$$ $$")).toBe(false);
  });
});

describe("renderMathText: xavfsizlik", () => {
  it("formuladan tashqaridagi HTML escape qilinadi", () => {
    const html = renderMathText('<img src=x onerror="alert(1)"> $x$');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain("katex");
  });

  it("\\href kabi xavfli buyruqlar ishlamaydi (trust: false)", () => {
    const html = renderMathText("$\\href{javascript:alert(1)}{x}$");
    // Manba matni <annotation> ichida qoladi, lekin havola (href atributi) yaratilmaydi
    expect(html).not.toMatch(/href\s*=/i);
    expect(html).toContain("#cc0000");
  });

  it("noto'g'ri LaTeX sahifani buzmaydi: xato qizil matn bo'lib chiqadi", () => {
    expect(() => renderMathText("$\\frac{1}{$")).not.toThrow();
    expect(renderMathText("$\\frac{1}$")).toContain("katex-error");
  });

  it("kasr KaTeX bilan chiziladi", () => {
    expect(renderMathText("$\\frac{3}{4}$")).toContain("mfrac");
  });
});
