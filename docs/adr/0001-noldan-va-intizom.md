# ADR-0001: Kod noldan yoziladi, intizom birinchi kundan

- Sana: 2026-11-19 · Holat: qabul qilindi

## Kontekst

Ona tili platformasi (`sherzodabduxalimov`) deyarli bir xil funksiyalarga ega, ishlaydigan kodi bor. Lekin sifat qoidalari u yerga kech qo'shilgan va katta fayllar (700+ qator) to'planib qolgan.

## Qaror

Kod noldan yoziladi. Stek bir xil: NestJS, Prisma, grammY, React, Vite, Tailwind. Eski koddan faqat sinalgan kichik bo'laklar olinadi (initData tekshiruvi, guard) va yangi qoidalarga moslanadi. ESLint chegaralari, husky, commitlint va CI birinchi commitdan ishlaydi.

## Oqibatlar

Boshlanish sekinroq bo'ladi, lekin keyin katta refaktor kerak bo'lmaydi. Ikki loyiha mustaqil yashaydi, ular orasida umumiy kod yo'q.
