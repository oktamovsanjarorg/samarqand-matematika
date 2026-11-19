import { MathText } from "../components/MathText";

/** Faqat dev: komponentlar va formulalar ko'rinishini tekshirish (T-013 da kengayadi) */
const SAMPLES = [
  "Kasr: $\\frac{3}{4} + \\frac{1}{6} = \\frac{11}{12}$",
  "Kvadrat tenglama: $ax^2 + bx + c = 0$, bu yerda $a \\ne 0$.",
  "$$x_{1,2} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$",
  "Trigonometriya: $\\sin^2\\alpha + \\cos^2\\alpha = 1$",
  "Integral: $$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$",
  "Limit: $\\lim\\limits_{x \\to 0} \\frac{\\sin x}{x} = 1$",
  "Narx 5\\$ va xato formula: $\\frac{1}$",
];

export function KitPage() {
  return (
    <div className="space-y-3 p-4">
      <h1 className="text-xl font-extrabold">UI kit</h1>
      {SAMPLES.map((s) => (
        <div key={s} className="card">
          <MathText text={s} />
        </div>
      ))}
    </div>
  );
}
