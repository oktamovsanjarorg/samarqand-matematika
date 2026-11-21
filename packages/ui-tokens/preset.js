/** Tailwind preset: ranglar tokens.css o'zgaruvchilaridan olinadi. Admin va Mini App shu presetni ishlatadi. */
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Manrope Variable"', "system-ui", "sans-serif"],
      },
      colors: {
        bg: c("bg"),
        surface: c("surface"),
        section: c("section"),
        text: c("text"),
        hint: c("hint"),
        link: c("link"),
        danger: c("danger"),
        success: c("success"),
        brand: { DEFAULT: c("brand"), soft: "rgb(var(--c-brand) / var(--brand-soft-alpha))" },
        accent: c("accent"),
      },
      // Matn rangi alohida: tungi rejimda brend fon (oq matn ostida) to'q, brend matn (to'q fonda) och bo'lishi kerak.
      // Bitta rang ikkalasida 4.5:1 bera olmaydi (T-071)
      textColor: { brand: c("brand-text") },
      borderRadius: { card: "16px" },
      spacing: {
        "safe-top": "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px))",
        "safe-bottom": "max(var(--tg-safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px))",
      },
    },
  },
};
