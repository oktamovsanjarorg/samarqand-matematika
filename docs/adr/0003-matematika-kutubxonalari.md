# ADR-0003: Formulalar va javob tekshiruvi

- Sana: 2026-11-19 · Holat: qabul qilindi

## Kontekst

Savollar, variantlar va izohlarda formulalar bo'ladi. Son javoblar turli yozuvda keladi: `3/4`, `0,75`, `\frac{3}{4}`. PLAN.md'da Compute Engine tavsiya qilingan edi.

## Qaror

- **Ko'rsatish: KaTeX 0.19** (`packages/math/src/render.ts`). Sozlamalar: `trust: false` (`\href` va `\url` o'chiq), `maxExpand` va `maxSize` cheklangan, `throwOnError: false`. Formuladan tashqaridagi matn HTML-escape qilinadi. Natija `MathText` komponentida `innerHTML` orqali beriladi.
- **Son javob (BR-M04): o'zimizning aniq kasr parseri** (`bigint`). Float xatolari bo'lmaydi, tashqi kutubxona kerak emas. Ixtiyoriy tolerance qo'llab-quvvatlanadi.
- **Compute Engine olinmadi:** u faqat ESM formatida chiqadi, API esa CommonJS, va versiyasi hali 0.x (0.194).
- **Ifoda javoblari** (`2(x+1)` = `2x+2`, T-074, 2026-11-21): mathjs o'rniga **o'zimizning kichik parserimiz** (`packages/math/src/expression.ts`). Sabab: `eval` yo'q, faqat ruxsat etilgan grammatika (+ - * / ^, qavslar, yashirin ko'paytirish, bir harfli o'zgaruvchilar, `pi`, `e`, `sqrt sin cos tan cot ln log abs exp`), yangi bog'liqlik yo'q, admin brauzerida ham ishlaydi. LaTeX (`\frac`, `\sqrt`, `\cdot`) va Unicode (`²`, `√`, `−`, `·`) oddiy ko'rinishga keltiriladi, o'nlik vergul qabul qilinadi.
  - Ikki ifoda doimiy urug'li 24 ta tasodifiy nuqtada (o'zgaruvchilar [-2.5; 2.5]) solishtiriladi, nisbiy xato 1e-9. Ikkalasi ham aniqlanmagan nuqta tashlanadi.
  - Ifoda o'qilmasa yoki aniqlangan nuqta 6 tadan kam bo'lsa natija `MANUAL` (ustoz tekshiradi), ayblov yo'q.
  - Shakl muhim savolda (ko'paytuvchilarga ajratish, soddalashtirish) ustoz `manual` belgilaydi: ekvivalentlik `x^2-1` ni ham "to'g'ri" deb qo'yardi.
  - MathLive kiritish keyin: hozircha oddiy matn maydoni.

## Oqibatlar

KaTeX JS (~260 kB) faqat formula ishlatiladigan sahifalarda yuklanadi (lazy chunk). Formulasiz sahifalar yengil qoladi.
