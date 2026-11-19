# ADR-0003: Formulalar va javob tekshiruvi

- Sana: 2026-11-19 · Holat: qabul qilindi

## Kontekst

Savollar, variantlar va izohlarda formulalar bo'ladi. Son javoblar turli yozuvda keladi: `3/4`, `0,75`, `\frac{3}{4}`. PLAN.md'da Compute Engine tavsiya qilingan edi.

## Qaror

- **Ko'rsatish: KaTeX 0.19** (`packages/math/src/render.ts`). Sozlamalar: `trust: false` (`\href` va `\url` o'chiq), `maxExpand` va `maxSize` cheklangan, `throwOnError: false`. Formuladan tashqaridagi matn HTML-escape qilinadi. Natija `MathText` komponentida `innerHTML` orqali beriladi.
- **Son javob (BR-M04): o'zimizning aniq kasr parseri** (`bigint`). Float xatolari bo'lmaydi, tashqi kutubxona kerak emas. Ixtiyoriy tolerance qo'llab-quvvatlanadi.
- **Compute Engine olinmadi:** u faqat ESM formatida chiqadi, API esa CommonJS, va versiyasi hali 0.x (0.194).
- **Ifoda javoblari** (`2(x+1)` = `2x+2`) T-022 da `EXPRESSION` turi bilan qilinadi. Taklif: mathjs bilan ifodani bir nechta tasodifiy nuqtada hisoblab solishtirish. Kiritish MathLive orqali bo'ladi, u ASCII-math chiqaradi.

## Oqibatlar

KaTeX JS (~260 kB) faqat formula ishlatiladigan sahifalarda yuklanadi (lazy chunk). Formulasiz sahifalar yengil qoladi.
