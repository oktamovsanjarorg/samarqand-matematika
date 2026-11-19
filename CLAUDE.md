# CLAUDE.md: AI agentlar uchun qoidalar (Samarqand matematika)

Ustoz Komil Sobirov va shogirdlari uchun matematika platformasi: Telegram Mini App, bot va admin panel.
Kodni asosan AI agentlar yozadi. Quyidagi qoidalar **majburiy**. Foydalanuvchi bilan o'zbek tilida gaplashiladi.

## Avval o'qing

1. `docs/README.md`: hujjatlar xaritasi. `docs/12-ai-playbook.md`: ish tartibi.
2. Vazifa `docs/09-tasks.md` dan olinadi (masalan `T-010`). Vazifasiz kod yozilmaydi. Claude Code'da: `/task T-XXX`.
3. Talablar (`FR-*`) va biznes qoidalar (`BR-*`): `docs/01-requirements.md`, `docs/04-business-rules.md`.
4. Ochiq savollar: `docs/10-open-questions.md`. Javob kelmagan bo'lsa, standart taklif qo'llanadi va PR'da yoziladi.

## Oltin qoidalar

- **Hujjat > kod.** Qoida o'zgarsa, hujjat ham shu PR'da yangilanadi.
- **RBAC faqat backend'da:** global `AuthGuard`, `@Roles()`, ochiq endpoint'lar `@Public()`. Har yangi endpoint'ga "ruxsat yo'q" testi yoziladi.
- **AI hech qachon yakuniy baho qo'ymaydi.** Oxirgi so'z ustozda. AI o'chiq bo'lsa ham oqim ishlaydi.
- **AI shubhasi (ko'chirish) o'quvchiga ko'rsatilmaydi**, faqat ustozning navbatiga tushadi (BR-W05).
- **Test paytida to'g'ri javoblar kliyentga yuborilmaydi.** Vaqt server bo'yicha hisoblanadi.
- **Shaxsiy ma'lumot repoga tushmaydi:** karta, telefon, token va real ismlar `.env` da turadi. Demo yoki soxta ma'lumot yaratilmaydi.
- **Sirlar kodda ham, logda ham bo'lmaydi.** Env Zod bilan tekshiriladi, yashirin standart qiymat (`process.env.X || "..."`) yozilmaydi.
- **Matnlar:** interfeys o'zbek lotinida. Foydalanuvchi ko'radigan matnda `oʻ gʻ` uchun U+02BB (ʻ) ishlatiladi. Kod va izohlarda oddiy `'` bo'lishi mumkin.
- **Ranglar** faqat `packages/ui-tokens` da yoziladi. UI'da hex rang yozish ESLint bilan taqiqlangan. Brend rangi: logodagi to'q ko'k `#143F63`.
- **Vaqt:** `Asia/Tashkent`, bazada `timestamptz`.

## Texnik

- TypeScript strict, `any` ishlatilmaydi. Zod sxemalar `packages/shared` da turadi, API va UI bitta sxemadan foydalanadi.
- **Hajm (ESLint majburlaydi):** fayl ≤300 qator, funksiya ≤60 qator, complexity ≤12, ichma-ichlik ≤3, parametr ≤4. `eslint-disable` bilan chetlab o'tish taqiqlangan.
- Paket chegaralari: UI va bot `@samarqand/db` ni import qilmaydi, paketlar ilovalarni import qilmaydi.
- Bog'liqliklar aniq versiyada yoziladi (`^` ishlatilmaydi). Yangi paket qo'shilsa, sababi PR'da yoziladi.
- API dev rejimda swc bilan ishlaydi. tsx ishlatilmaydi, chunki u decorator metadata chiqarmaydi.
- Migratsiya: `pnpm db:migrate` (lokal). Production'da API konteyneri ishga tushganda `prisma migrate deploy` bajariladi. Qo'llangan migratsiya tahrirlanmaydi.

## Buyruqlar

`pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`. PR ochishdan oldin hammasi yashil bo'lishi kerak.
Lokal: `pnpm db:up` (Postgres :5435, Redis :6383), API :4300, Mini App :5190, admin :5191.

## PR

- Kichik (≤400 qator), bitta vazifa. Sarlavha conventional bo'ladi: `feat(tests): T-030 haftalik test oynasi`.
- Tavsifda: vazifa ID, FR/BR, qanday sinalgani, UI bo'lsa skrinshot, qabul qilingan taxminlar.
- `BR-*` ga tegadigan har testning nomida BR ID turadi.
