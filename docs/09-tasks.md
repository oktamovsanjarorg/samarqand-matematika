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

| ID     | Vazifa                                                                                                                                                                                               | Holat |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T-030  | Haftalik test API: oyna (vaqtdan), bitta urinish, natija yopilgandan keyin, topshirmaganga 0, eslatmalar 24/3 soat, rejalashtiruvchi (BR-W01–W03, W07–W09)                                           | ✅    |
| T-030b | Admin "Haftalik": testlar ro'yxati, yaratish (keyingi hafta oynasi standart, Toshkent vaqti), bankdan savol tanlash, natijalar jadvali                                                               | ✅    |
| T-030c | Mini App: haftalik testlar ro'yxati va Asosiy'da joriy test, yechish (qolgan vaqt), "topshirildi, natija yopilgach", natija va to'g'ri javoblar                                                      | ✅    |
| T-031  | Yechim rasmlari: har savolga 1–3 ta (kliyentda siqish, `MEDIA_DIR/solutions`), faqat ochiq urinishga; rasmsiz to'g'ri javob 0 ball (BR-W04); natijada rasmlar                                        | ✅    |
| T-032  | `AiProvider` interfeysi, hukm sxemasi, Claude provayderi (structured outputs, zaxira model), baholash to'plami skripti, ADR-0004. Provayder tanlovi real to'plamdan keyin (Q-03)                     | ✅    |
| T-033  | AI yechim tekshiruvi navbati (`AiReview`, bazada; rejalashtiruvchi har daqiqada, 3 urinish, `AI_DAILY_LIMIT`), shubha belgisi, o'quvchilar orasidagi bir xil xato va tarixdan keskin farq signallari | ✅    |
| T-034  | Ustoz navbati API: shubhali va signalli javoblar birinchi, AI tavsiyasi, ustoz bali (0/1, izoh) urinish balini qayta hisoblaydi; o'quvchi yopilgach ball va izohni ko'radi (BR-W05, W06)             | ✅    |
| T-034b | Admin: tekshirish navbati sahifasi (rasmlar, AI hukmi, signallar, ball qo'yish); Mini App: natijada ustoz izohi                                                                                      | ✅    |
| T-035  | Reyting: test va umumiy (BR-W10), Mini App'da natija va haftalik ro'yxatda                                                                                                                           | ✅    |
| T-035b | Ota-onaga haftalik hisobot: oyna yopilganda tasdiqlangan ota-onaga ball va o'rin, ishlamaganga "topshirmadi" (Q-10)                                                                                  | ✅    |

### 3-bosqich: AI yordamchi

| ID    | Vazifa                                                                                                                                                          | Holat |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T-040 | Yordamchi API: `TutorChat`/`TutorMessage`, rejimlar (mashq, erkin), kontekst serverda, BR-T01 (ochiq haftalik savol), BR-T03 kunlik limit, AI o'chiq bo'lsa 503 | ✅    |
| T-041 | Mini App: mavzu testi savolida "Yordamchi" paneli (javob avval saqlanadi), Asosiy'da erkin suhbat sahifasi, xato va limit holatlari                             | ✅    |
| T-042 | Admin "Yordamchi": o'quvchilar suhbatlari (rejim bo'yicha, o'quvchi savollari soni — Q-07 statistikasi), suhbatni o'qish (BR-T04)                               | ✅    |
| T-043 | Haftalik test yopilgach "Xatoni tushuntir": o'quvchining yechim rasmi, ustoz izohi va tekshiruv qadamlari bilan (ko'chirish belgilari modelga bormaydi, BR-W05) | ✅    |

### 4-bosqich: Mock va offline

| ID     | Vazifa                                                                                                                                                                                                      | Holat |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T-050  | Imtihon shabloni (BR-M01): bo'limlar (savol turlari, soni, bitta savol bali), vaqt, shkala va daraja chegaralari; admin sozlamalarda; "Milliy sertifikat" taklifi PLAN §5.2.1 qiymatlari bilan (Q-09)       | ✅    |
| T-051  | Mock API (ustoz): shablondan mock (shablon nusxasi saqlanadi), bo'limlarga savol (soni va turi shablonga mos), oyna, nashr; boshlangan mock savollari o'zgarmaydi                                           | ✅    |
| T-051b | Mock urinishi (o'quvchi): server vaqti bo'yicha muddat (shablon vaqti, oyna yopilishidan keyin emas), avtomatik topshirish, to'g'ri javoblar yopilguncha yo'q, xom ball bo'limlar bo'yicha (BR-M03), BR-T01 | ✅    |
| T-051c | Admin: mocklar sahifasi, bo'limlarga savol tanlash                                                                                                                                                          | ✅    |
| T-052  | Mini App: mocklar, yechish (qolgan vaqt), natija: bo'limlar bo'yicha xom ball, taxminiy daraja (BR-M02, M05)                                                                                                | ✅    |
| T-053  | Rasch (`packages/math`, ADR-0005): mock yopilganda vaqti o'tganlar topshiriladi, 30+ topshirgan bo'lsa Rasch, aks holda taxminiy (BR-M05); natija o'quvchiga botda                                          | ✅    |
| T-053b | Admin: mock natijalari (ball, daraja, bo'limlar, usul: Rasch yoki taxminiy)                                                                                                                                 | ✅    |
| T-054  | Offline guruhlar API: guruh (nom, jadval, faol), o'quvchilarni qo'shish (boshqa guruhdan ko'chadi) va olib tashlash; o'quvchilar ro'yxatida guruh                                                           | ✅    |
| T-054b | Admin: guruhlar sahifasi, guruhga o'quvchi qo'shish                                                                                                                                                         | ✅    |
| T-055  | Davomat API: guruh va sana bo'yicha belgilash, kelmagan yoki kechikkanda tasdiqlangan ota-onaga xabar, tuzatish xabari (BR-G01..G03)                                                                        | ✅    |
| T-055b | Admin: guruh sahifasida davomat belgilash                                                                                                                                                                   | ✅    |
| T-056  | Tashqi test importi API: CSV parser, telefon/ism bo'yicha moslash, oldindan ko'rish, saqlash, qo'lda biriktirish (Q-12, BR-G04)                                                                             | ✅    |
| T-056b | Admin: tashqi test importi sahifasi (fayl, oldindan ko'rish, moslanmaganlarni biriktirish)                                                                                                                  | ✅    |
| T-056c | Mini App: o'quvchi o'z offline test natijasini bo'limlar bo'yicha ko'radi                                                                                                                                   | ✅    |

## 5-bosqich: ko'rsatmalar va dizayn

| ID    | Vazifa                                                                                                                                                                | Holat |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T-060 | Admin karkasi: kompyuterda guruhlangan yon panel, telefonda tepa panel va ochiladigan menyu                                                                           | ✅    |
| T-061 | Admin bosh sahifa: ustozni kutayotgan ishlar (yangi o'quvchilar, cheklar, yozma javoblar navbati, ota-ona so'rovlari, moslanmagan offline qatorlar) va menyuda sonlar | ✅    |
| T-062 | O'quvchiga tavsiya: kuchsiz mavzular (mavzu testi, haftalik, mock) faktlar bilan, dars va mavzu testiga havola; Asosiy sahifada                                       | ✅    |
| T-063 | Ustozga tavsiya: e'tibor kerak o'quvchilar (7+ kun faolsiz, natijasi tushgan, ketma-ket dars qoldirgan, haftalikni topshirmagan), sababi bilan                        | ✅    |
| T-064 | Mini App Asosiy sahifa dizayni: salomlashuv va holat bloki, keyingi qadam                                                                                             | ✅    |
| T-065 | Mini App Profil: guruh, ota-ona holati, natijalar tarixi (haftalik, mock, offline)                                                                                    | ✅    |

## 6-bosqich: sayqal va o'quv oqimi

| ID    | Vazifa                                                                                                                                                                      | Holat |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T-066 | Dars sahifasi oxiri: mavzu testi tugmasi (savollar soni bilan), oldingi va keyingi dars                                                                                     | ✅    |
| T-067 | Darslar ro'yxati: mavzu bo'yicha eng yaxshi natija va mavzu testi tugmasi                                                                                                   | ✅    |
| T-068 | Admin o'quvchi kartasi: natijalar, davomat, ota-ona, e'tibor sabablari va kuchsiz mavzular bitta sahifada                                                                   | ✅    |
| T-069 | Ota-ona kabineti: Asosiy sahifada tasdiqlangan farzandlar, davomat, natijalar va takrorlash kerak mavzular                                                                  | ✅    |
| T-070 | Ota-ona kabineti: kutilayotgan ulanish, kirish holati va obuna muddati, haftalikda o'rin, Darslar tabi yashirin                                                             | ✅    |
| T-071 | Tungi rejim va kontrast: WCAG AA (axe) brauzer testi, brend fon va brend matn alohida token, Telegram ranglari kontrast bo'yicha tekshiriladi, zoom yoqildi                 | ✅    |
| T-072 | Kontrast tekshiruvi kengaytirildi: Mini App'ning barcha o'quvchi va ota-ona ekranlari (ikkala rejim), admin bo'limlari                                                      | ✅    |
| T-073 | Ota-ona Profili: farzandlar holati, botdan keladigan xabarlar, yana farzand ulash yo'li                                                                                     | ✅    |
| T-074 | Ifoda javobini avtomatik tekshirish: o'z parserimiz (LaTeX, Unicode, yashirin ko'paytirish), tasodifiy nuqtalarda tenglik, "Ustoz tekshiradi" belgisi, admin'da jonli holat | ✅    |
| T-075 | Admin jurnali (faqat ustoz): xodimlar amallari kun bo'yicha, obyekt nomi va havolasi, bo'lim va xodim filtri, sahifalash                                                    | ✅    |
| T-076 | Haftalik va mock natijalarini Excel'ga (CSV) yuklab olish: BOM, `;`, o'nlik vergul, formula-injeksiyadan himoya                                                             | ✅    |
| T-077 | Mini App: ifoda javobi yozilayotganda formula ko'rinishi (KaTeX), tushunilmasa darhol ogohlantirish                                                                         | ✅    |
| T-078 | O'quvchilar ro'yxatini Excel'ga yuklab olish (filtr va qidiruv bo'yicha, telefon matn ko'rinishida)                                                                         | ✅    |
| T-079 | Xatolarim: mavzu testida oxirgi marta xato ishlangan savollar to'g'ri javob va yechim bilan, mavzu bo'yicha, qayta ishlash havolasi                                         | ✅    |
