# 03: Arxitektura

## Umumiy ko'rinish

```
Telegram ──► bot (grammY) ──internal API──┐
   │                                      ▼
   └─ Mini App (React) ──HTTPS /api──► api (NestJS, Fastify) ──► PostgreSQL 16
                                          │     ▲
Admin panel (React) ──HTTPS /api──────────┘     │ rejalashtiruvchilar (setInterval, bazada egallash)
                                          │
                                          ├──► Telegram Bot API (xabarlar, NotifyService)
                                          ├──► AI provayder (Claude yoki DeepSeek, `AI_PROVIDER=off` bo'lsa yo'q)
                                          └──► MEDIA_DIR (yechim rasmlari, cheklar)
```

Production'da hammasi bitta serverda Docker Compose bilan ishlaydi (`06-infrastructure.md`). Caddy (`web` konteyneri) Mini App'ni `/`, admin panelni `/admin/` da beradi va `/api` ni API'ga uzatadi. Mini App sahifalari alohida chunk'larda yuklanadi (T-131): birinchi ochilishda faqat Asosiy (~112 KB gzip), KaTeX matematik matnli sahifa ochilganda. Deploydan keyin eski sahifa yo'q chunk'ni so'rasa (`vite:preloadError`), sahifa bir marta qayta yuklanadi. Admin panelda ham shunday (T-132): kirish va bosh sahifa darhol, qolgani kerak bo'lganda (~110 KB gzip).

## Monorepo

| Paket                | Vazifasi                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`           | NestJS 11 (Fastify, swc). REST, RBAC, rejalashtiruvchilar, AI navbati, bot xabarlari                                                  |
| `apps/bot`           | grammY: `/start`, `/admin` (kirish havolasi), `/ota` (ota-ona havolasi), telefon kontakti. API'ga `internal/*` orqali murojaat qiladi |
| `apps/miniapp`       | O'quvchi va ota-ona uchun Telegram Mini App (React 18, Vite, React Query, Tailwind)                                                   |
| `apps/admin`         | Ustoz va yordamchi paneli (React 18, Vite, React Query)                                                                               |
| `apps/landing`       | Sayt (T-173): build paytida statik HTML, sitemap va robots; asosiy domenda Caddy beradi                                               |
| `packages/db`        | Prisma sxemasi va migratsiyalar                                                                                                       |
| `packages/shared`    | Zod sxemalar va tiplar (API va UI bitta sxemadan), rollar, baholash, CSV                                                              |
| `packages/math`      | Son va ifoda ekvivalentligi, ifoda parseri va LaTeX ko'rinishi, Rasch (ADR-0003, ADR-0005)                                            |
| `packages/ui-tokens` | Ranglar (CSS o'zgaruvchilari, kunduzgi va tungi), Tailwind preset. Hex rang faqat shu yerda                                           |

Chegaralar (ESLint): UI va bot `@samarqand/db` ni import qilmaydi; paketlar ilovalarni import qilmaydi.

## API ichki tuzilishi

`apps/api/src/<modul>/`: `*.controller.ts` yupqa (ruxsat va kirish ma'lumoti), mantiq `*.service.ts` da.

| Modul                          | Nima qiladi                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `auth`                         | `initData` tekshiruvi, JWT, global `AuthGuard` (rol bazadan)                                    |
| `access`                       | BR-A04: to'liq kirish qarori (global)                                                           |
| `staff`                        | Admin kirish havolasi, yordamchilar (T-086)                                                     |
| `students`, `parents`, `users` | Profil, qabul, ota-ona ulanishi                                                                 |
| `content`, `questions`         | Kurs, mavzu, dars, savollar banki, javob tekshiruvi (`check.ts`)                                |
| `topic-tests`                  | Mavzu testlari, statistika, xatolar                                                             |
| `weekly`                       | Haftalik test, yechim rasmlari, reyting, ustoz navbati, AI tekshiruvi navbati, rejalashtiruvchi |
| `mock`                         | Imtihon shablonlari, mock, Rasch bilan baholash, rejalashtiruvchi                               |
| `tutor`                        | AI yordamchi suhbatlari, rejim qoidalari, kunlik limit                                          |
| `groups`, `offline`            | Guruhlar, davomat, CSV natijalar                                                                |
| `insights`, `dashboard`        | Faktli tavsiyalar, e'tibor ro'yxati, bosh sahifa                                                |
| `billing`                      | Tariflar, karta, cheklar, obuna                                                                 |
| `audit`                        | Audit yozuvi (global) va jurnal                                                                 |
| `notify`                       | Telegram xabarlari: matnlar `messages.ts` da, yuborish `NotifyService` (global)                 |
| `ai`                           | `AiProvider` interfeysi, Claude provayderi, promptlar (ADR-0004)                                |
| `storage`                      | `MediaStore`: rasmlar diskda (`MEDIA_DIR`)                                                      |

## Fon ishlari

Redis va BullMQ hozircha ishlatilmaydi (Redis konteyneri compose'da kelajak uchun turibdi). Fon ishlari API ichidagi rejalashtiruvchilarda:

| Rejalashtiruvchi        | Har (`WEEKLY_TICK_SEC`, 60 s) | Nima qiladi                                                                                              |
| ----------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `WeeklyScheduler`       | daqiqada                      | ochilganda e'lon, 24 va 3 soatlik eslatma, yopish (0 ball, natija, ota-ona, ustozga hisobot), AI navbati |
| `MockScheduler`         | daqiqada                      | ochilganda e'lon, yopish (vaqti o'tgan urinishlarni topshirish, Rasch yoki taxminiy ball, xabarlar)      |
| `SubscriptionReminders` | daqiqada                      | obuna tugashiga 3 kun qolganda va tugaganda eslatma (BR-B06)                                             |

Har ish bazada `updateMany ... where: { closedAt: null }` kabi shart bilan "egallanadi", shuning uchun ikki nusxa ishlasa ham xabar ikki marta ketmaydi. AI navbati (`AiReview`) yozuvlarni partiyalab oladi, 3 martagacha qayta uradi, 10 daqiqa osilib qolganini qaytadan oladi.

## Unumdorlik (T-189)

- **Prisma `_count` katta jadvalda ishlatilmaydi.** `_count: { select: { answers: ... } }` (where bilan ham, where'siz ham) bog'langan **butun** jadvalni `GROUP BY` qiladi: bitta o'quvchining 40 ta urinishi uchun ham platformadagi barcha javoblar sanaladi. Javoblar, urinishlar, natijalar, xabarlar, rasmlar uchun `groupBy({ by: [...], where: { id: { in: ids } } })` va `common/count-map.ts` ishlatiladi. Kichik jadvallar (savollar, ota-onalar, guruh a'zolari) va barcha qatorlar kerak bo'lgan ro'yxatlar bundan mustasno.
- **Ko'p qatorli statistika bazada sanaladi** (`common/answer-stats.ts`, `$queryRaw` + `GROUP BY`): har javobni JS'ga yuklab sanash taqiqlanadi.
- **Postgres JIT o'chiq** (migratsiya `disable_jit`): qisqa so'rovlarda xarajat noto'g'ri baholansa kompilyatsiyaga 300 ms gacha ketardi.
- **Front-end:** sahifalar `lazy`, KaTeX va zod alohida fayllarda, kutubxonalar `vendor` faylida (deploy'da brauzer keshida qoladi). `/assets/*` bir yilga keshlanadi.
- Tekshirish: lokal alohida bazada real hajm (400 o'quvchi, 160 ming javob) bilan endpoint vaqti va so'rovlar soni o'lchanadi.

## Kirish oqimlari

- **Mini App:** Telegram `initData` → `POST auth/telegram` → JWT (`JWT_TTL`) va o'quvchi/ota-ona profili (T-189: ilova ochilishida `/me/profile` kutilmaydi). Har so'rovda `AuthGuard` foydalanuvchini va rolini bazadan oladi; bloklangan bo'lsa token ishlamaydi.
- **Admin:** botga `/admin` → bot `internal/admin-login-link` → 5 daqiqalik bir martalik havola → `auth/admin-link` → admin JWT (`ADMIN_JWT_TTL`, 12 soat).
- **Bot → API:** `internal/*` endpoint'lari `InternalGuard` bilan: `x-internal-key` sarlavhasi bot tokenidan hosil qilingan kalit bilan solishtiriladi.

## Xatolar va matnlar

- Kirish ma'lumoti Zod bilan tekshiriladi (`parseBody`), xato 400.
- Biznes xatolari `{ code, message }` ko'rinishida (`LOCKED`, `NAME_LOCKED`, `NOT_EMPTY`, `AI_BLOCKED` ...), matni o'zbekcha va foydalanuvchiga ko'rsatiladi.

## Sinov

- `packages/*`: vitest unit testlari (jadvalli).
- `apps/api/test`: haqiqiy Postgres bilan e2e (har endpoint'ga "ruxsat yo'q" testi, BR ID nomda).
- `e2e/`: Playwright (Pixel 7): Mini App Telegram stub bilan, admin bir martalik havola bilan, axe (WCAG AA), skrinshotlar `e2e/.results/`.
- CI: lint, format, typecheck, test, build, Prisma drift, Playwright; deploy shularga bog'liq.

## Arxitektura qarorlari

`docs/adr/`: 0001 noldan yozish va intizom, 0002 brend rangi, 0003 matematika kutubxonalari (o'z parserimiz), 0004 AI provayder, 0005 Rasch.
