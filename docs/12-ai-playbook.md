# 12: AI agent ish tartibi (playbook)

Qoidalar `CLAUDE.md` da. Bu hujjatda ishning **qanday** bajarilishi yozilgan.

## 1. Ish tsikli

1. `docs/09-tasks.md` dan ⬜ vazifa olinadi va 🟨 qilinadi.
2. O'qiladi: tegishli FR, BR, `10-open-questions.md` va PLAN.md bo'limi.
3. Qisqa reja tuziladi: fayllar (har biri ≤300 qator), jadvallar, endpoint'lar, ruxsatlar, testlar.
4. Avval test yoziladi (BR ID nomda), keyin kod. Bug bo'lsa, avval qizil test yoziladi.
5. `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` yashil bo'lishi kerak.
6. UI bo'lsa: staging'da Telegram ichida kunduzgi va tungi rejim, 360px kenglik tekshiriladi.
7. Hujjat yangilanadi, vazifa ✅ qilinadi, PR ochiladi.

## 2. Noaniqlikda qaror zinapoyasi

Yuqoridan pastga qaraladi, javob topilgan joyda to'xtaladi:

1. Vazifa tavsifi.
2. BR/FR hujjatlari (hujjat koddan ustun).
3. `10-open-questions.md` dagi standart taklif.
4. Mavjud koddagi namuna. `~/projects/sherzodabduxalimov` ham namuna bo'la oladi, lekin ko'r-ko'rona ko'chirilmaydi.
5. Agent o'zi eng sodda va xavfsiz variantni tanlaydi. Qaror PR'ga yoziladi, arxitektura qarori ADR'ga yoziladi.

Faqat shu hollarda to'xtab, egasidan so'raladi: sir yoki akkaunt kerak bo'lsa; production'da qaytarib bo'lmaydigan amal bo'lsa; pulga ta'sir qiladigan ziddiyat bo'lsa.

## 3. Kod tuzilishi

- API modul: `apps/api/src/<modul>/` ichida `*.module.ts`, `*.controller.ts` (yupqa), `*.service.ts` (mantiq), tiplar `packages/shared` da.
- Sof hisob-kitob (baholash, Rasch, ekvivalentlik) `packages/shared` yoki `packages/math` da yoziladi, framework'siz va unit testlar bilan.
- Fayl 300 qatorga yaqinlashsa, ma'no bo'yicha bo'linadi (masalan `*.query.ts`, `*.mapper.ts`).

## 4. Self-review

- [ ] Har yangi endpoint'da `@Roles` yoki `@Public` bor va "ruxsat yo'q" testi yozilgan
- [ ] Yozish amallari audit log'ga tushadi
- [ ] Test paytida to'g'ri javob kliyentga chiqmaydi
- [ ] AI natijasi faqat taklif sifatida saqlanadi (BR-W06), shubha o'quvchiga ko'rinmaydi (BR-W05)
- [ ] Foydalanuvchiga ko'rinadigan matnlar o'zbekcha, `ʻ` belgisi to'g'ri
- [ ] Repoga shaxsiy ma'lumot tushmagan
