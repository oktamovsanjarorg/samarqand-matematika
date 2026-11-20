# 09: Vazifalar

> Holat: ⬜ boshlanmagan · 🟨 jarayonda · ✅ tayyor. Bitta vazifa uchun bitta PR (≤400 qator).
> Bosqichlar: `docs/PLAN.md` §10.

## 0-bosqich: poydevor

| ID    | Vazifa                                                                                                                             | Holat |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T-001 | Monorepo: pnpm, Turborepo, TS strict, aniq versiyalar, `minimumReleaseAge`                                                         | ✅    |
| T-002 | ESLint strict (≤300/≤60, complexity, paket chegaralari, hex rang taqiqi), Prettier, husky, lint-staged, commitlint                 | ✅    |
| T-003 | `packages/shared`: rollar, auth sxemalari, initData HMAC tekshiruvi va testlari                                                    | ✅    |
| T-004 | `packages/db`: Prisma, boshlang'ich sxema (User, LoginToken, AppSetting, AuditLog)                                                 | ✅    |
| T-005 | `packages/ui-tokens`: logodan olingan ko'k brend, tungi rejim, Tailwind preset                                                     | ✅    |
| T-006 | API: NestJS (Fastify), env Zod bilan, Telegram auth → JWT, global AuthGuard va RBAC, health, rate limit, e2e testlar               | ✅    |
| T-007 | Bot: `/start` va Mini App tugmasi                                                                                                  | ✅    |
| T-008 | Mini App: Telegram mavzusi, kirish, 3 tab (Darslar, Asosiy, Profil). Admin: skelet                                                 | ✅    |
| T-009 | CI (GitHub Actions): format, lint, typecheck, test (Postgres bilan), build                                                         | ✅    |
| T-010 | Admin kirishi: bot `/admin` → 5 daqiqalik bir martalik havola → admin JWT (12 soat)                                                | ✅    |
| T-011 | Production: Dockerfile, compose, Caddy (HTTPS, sslip.io domen kelguncha), deploy skriptlari, CI auto-deploy (cheklangan SSH kalit) | ✅    |
| T-012 | Staging: test bot, `scripts/staging.sh`                                                                                            | ⬜    |
| T-013 | `packages/ui`: umumiy komponentlar (Button, Card, Skeleton, EmptyState, ErrorState, Dialog), `/_kit` sahifasi                      | ⬜    |
| T-014 | `packages/math`: KaTeX ko'rsatish, LaTeX sanitizatsiya, son javob ekvivalentligi (BR-M04) va jadvalli testlar (ADR-0003)           | ✅    |
| T-015 | Hujjatlar: 00-vision, 01-requirements, 02-roles-permissions, 03-architecture, 05-data-model, 11-ux (PLAN.md'dan ajratish)          | ⬜    |
| T-016 | Brauzer testlari (Playwright): Mini App Telegram stub bilan, admin bir martalik havola; CI'da alohida job, deploy unga bog'liq     | ✅    |

## 1-bosqich: MVP

| ID     | Vazifa                                                                                                                                                               | Holat |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T-020  | O'quvchi profili: onboarding (ism, telefon bot orqali), ustoz qabul qilishi, kirish rejimi AUTO/FREE/CLOSED (BR-S01–S04, BR-A04)                                     | ✅    |
| T-020b | Ota-ona ulanishi: bot `/ota` va `p_<kod>`, ustoz tasdig'i, shubhali belgilar (BR-S05, S06, A04)                                                                      | ✅    |
| T-020c | Admin "O'quvchilar" (yangilar, qidiruv, qabul, kirish rejimi) va "Ota-onalar" (navbat, shubha belgilari, tasdiq/rad)                                                 | ✅    |
| T-020d | Mini App onboarding: ism (shared sxema bilan tekshiruv) va raqamni ulashish (`requestContact`)                                                                       | ✅    |
| T-021  | Kontent backend: kurs → mavzu → dars (CRUD, tartiblash, BR-C01–C04), o'quvchi API                                                                                    | ✅    |
| T-021b | Admin kontent: kurs → mavzu → dars daraxti, tartiblash, nashr, dars muharriri (formula jonli ko'rinishi)                                                             | ✅    |
| T-021c | Mini App: Darslar ro'yxati (yopiq/bepul belgisi), dars sahifasi (KaTeX, video, Telegram orqaga tugmasi)                                                              | ✅    |
| T-022  | Savollar banki: turlar (SINGLE, MULTIPLE, NUMERIC, EXPRESSION, MATCHING, WRITTEN), avtomatik tekshiruv, namunaviy yechim, ko'nikma teglari                           | ✅    |
| T-022b | Admin savol muharriri: variantlar/juftlar, LaTeX jonli ko'rinishi, brauzerda tekshiruv, tartiblash. EXPRESSION tengligi (mathjs) va MathLive keyin, ADR bilan        | ✅    |
| T-023  | Mavzu testlari API: urinish, javob saqlash, topshirish, natija                                                                                                       | ✅    |
| T-023b | Mini App: mavzu testini yechish (avtomatik saqlash, qayta ochilganda davom), topshirish tasdig'i, natija, to'g'ri javob va yechim                                    | ✅    |
| T-024  | Asosiy (kirish qadamlari BR-A04, tugallanmagan test, oxirgi natijalar) va Profil (testlar soni, o'rtacha foiz, mavzular bo'yicha eng yaxshi natija); `GET /me/stats` | ✅    |
| T-025  | Qo'lda to'lov va obuna (API): tariflar, karta, chek yuklash, tasdiq/rad, obuna uzayishi (BR-B01–B05)                                                                 | ✅    |
| T-025b | Admin: "To'lovlar" (cheklar navbati, rasm, tasdiq/rad), "Sozlamalar" (tariflar, karta; faqat ustoz). Cheklar kunlik zaxirada (S3 media/)                             | ✅    |
| T-025c | Mini App "Obuna": tarif tanlash, karta (nusxalash), chek rasmi (1600px JPEG'ga siqiladi), holat, bekor qilish; Asosiy va Profildan havola                            | ✅    |
| T-026  | Word/Excel'dan savol import (pandoc, OMML → LaTeX)                                                                                                                   | ⬜    |
| T-027  | Bot xabarnomalari: ustozga yangi o'quvchi va ota-ona so'rovi, ota-onaga va o'quvchiga natija (NotifyService)                                                         | ✅    |

## 2-bosqich: haftalik test va AI tekshiruvi

| ID     | Vazifa                                                                                                                                                     | Holat |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T-030  | Haftalik test API: oyna (vaqtdan), bitta urinish, natija yopilgandan keyin, topshirmaganga 0, eslatmalar 24/3 soat, rejalashtiruvchi (BR-W01–W03, W07–W09) | ✅    |
| T-030b | Admin: haftalik testlar (yaratish, bankdan savol tanlash, oyna), natijalar jadvali                                                                         | ⬜    |
| T-030c | Mini App: haftalik test ro'yxati, yechish, "natija yopilgach", natija                                                                                      | ⬜    |
| T-031  | Yechim rasmlarini yuklash (siqish, saqlash)                                                                                                                | ⬜    |
| T-032  | `AiProvider` interfeysi va baholash to'plami, provayder tanlovi (Q-03, ADR)                                                                                | ⬜    |
| T-033  | AI yechim tekshiruvi: hukm sxemasi, ko'chirish signallari, o'quvchilar orasidagi o'xshashlik                                                               | ⬜    |
| T-034  | Ustoz navbati: shubhalilar birinchi turadi, tasdiqlash yoki o'zgartirish (BR-W05, W06)                                                                     | ⬜    |
| T-035  | Reyting va ota-onaga hisobot                                                                                                                               | ⬜    |

Keyingi bosqichlar (AI yordamchi, Mock, offline, ko'rsatmalar) 2-bosqich oxirida vazifalarga bo'linadi.
