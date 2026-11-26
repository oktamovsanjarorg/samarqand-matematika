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
| T-015 | Hujjatlar: 00-vision, 01-requirements, 02-roles-permissions, 03-architecture, 05-data-model, 11-ux (PLAN.md'dan ajratish)          | ✅    |
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
| T-026  | Word'dan savol import (pandoc, OMML → LaTeX). Excel (CSV) qismi T-100 da                                                                                             | ⬜    |
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

| ID    | Vazifa                                                                                                                                                                                                   | Holat |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| T-066 | Dars sahifasi oxiri: mavzu testi tugmasi (savollar soni bilan), oldingi va keyingi dars                                                                                                                  | ✅    |
| T-067 | Darslar ro'yxati: mavzu bo'yicha eng yaxshi natija va mavzu testi tugmasi                                                                                                                                | ✅    |
| T-068 | Admin o'quvchi kartasi: natijalar, davomat, ota-ona, e'tibor sabablari va kuchsiz mavzular bitta sahifada                                                                                                | ✅    |
| T-069 | Ota-ona kabineti: Asosiy sahifada tasdiqlangan farzandlar, davomat, natijalar va takrorlash kerak mavzular                                                                                               | ✅    |
| T-070 | Ota-ona kabineti: kutilayotgan ulanish, kirish holati va obuna muddati, haftalikda o'rin, Darslar tabi yashirin                                                                                          | ✅    |
| T-071 | Tungi rejim va kontrast: WCAG AA (axe) brauzer testi, brend fon va brend matn alohida token, Telegram ranglari kontrast bo'yicha tekshiriladi, zoom yoqildi                                              | ✅    |
| T-072 | Kontrast tekshiruvi kengaytirildi: Mini App'ning barcha o'quvchi va ota-ona ekranlari (ikkala rejim), admin bo'limlari                                                                                   | ✅    |
| T-073 | Ota-ona Profili: farzandlar holati, botdan keladigan xabarlar, yana farzand ulash yo'li                                                                                                                  | ✅    |
| T-074 | Ifoda javobini avtomatik tekshirish: o'z parserimiz (LaTeX, Unicode, yashirin ko'paytirish), tasodifiy nuqtalarda tenglik, "Ustoz tekshiradi" belgisi, admin'da jonli holat                              | ✅    |
| T-075 | Admin jurnali (faqat ustoz): xodimlar amallari kun bo'yicha, obyekt nomi va havolasi, bo'lim va xodim filtri, sahifalash                                                                                 | ✅    |
| T-076 | Haftalik va mock natijalarini Excel'ga (CSV) yuklab olish: BOM, `;`, o'nlik vergul, formula-injeksiyadan himoya                                                                                          | ✅    |
| T-077 | Mini App: ifoda javobi yozilayotganda formula ko'rinishi (KaTeX), tushunilmasa darhol ogohlantirish                                                                                                      | ✅    |
| T-078 | O'quvchilar ro'yxatini Excel'ga yuklab olish (filtr va qidiruv bo'yicha, telefon matn ko'rinishida)                                                                                                      | ✅    |
| T-079 | Xatolarim: mavzu testida oxirgi marta xato ishlangan savollar to'g'ri javob va yechim bilan, mavzu bo'yicha, qayta ishlash havolasi                                                                      | ✅    |
| T-080 | Haftalik test va mock ochilganda o'quvchilarga bot xabari (bir marta, eski testlar uchun yuborilmaydi)                                                                                                   | ✅    |
| T-081 | O'quvchiga bot xabari: ustoz qabul qilganda (to'liq kirish uchun qolgan qadamlar bilan) va kirish rejimi FREE yoki CLOSED bo'lganda                                                                      | ✅    |
| T-082 | Mock yopilganda tasdiqlangan ota-onaga farzandining natijasi (ball, daraja, taxminiy belgisi)                                                                                                            | ✅    |
| T-083 | Asosiy sahifada xatolar bo'lsa "Xatolar ustida ishlang" kartasi (savol va mavzu soni)                                                                                                                    | ✅    |
| T-084 | Haftalik test yopilganda ustozga hisobot: topshirganlar, ustoz qarorini kutayotgan va shubhali javoblar soni, navbatga tugma                                                                             | ✅    |
| T-085 | Savollar ro'yxati va test tuzish oynasida qo'lda tekshiriladigan ifoda savoliga "Ustoz tekshiradi" belgisi; accent rangi AA ga moslandi                                                                  | ✅    |
| T-086 | Yordamchilar: ustoz Sozlamalarda o'quvchini qidirib yordamchi qiladi va qaytarib oladi (`admin/staff`, BR-A05)                                                                                           | ✅    |
| T-087 | Ustoz va yordamchi sinovi reyting, natijalar, ota-ona hisoboti va Rasch kalibrovkasiga kirmaydi (BR-W10, BR-M05)                                                                                         | ✅    |
| T-088 | Yopiq dars yoki testda o'quvchiga qolgan qadamlar (qabul, ota-ona, to'lov) va "Obunani toʻlash" tugmasi                                                                                                  | ✅    |
| T-089 | Haftalik testdan nusxa olish: savollar ko'chadi, oyna keyingi haftaga suriladi, nomdagi raqam oshadi, nashrsiz saqlanadi                                                                                 | ✅    |
| T-090 | Obuna tugashi eslatmasi: 3 kun qolganda o'quvchi va ota-onaga, tugaganda o'quvchiga (BR-B06)                                                                                                             | ✅    |
| T-091 | Yangi dars haqida o'quvchilarga xabar: dars sahifasidagi tugma, bir marta, kirish bo'yicha qabul qiluvchilar (BR-C05)                                                                                    | ✅    |
| T-092 | `NOTIFY_TRANSPORT=off`: brauzer testlarida bot xabarlari Telegram'ga chiqmaydi (tasodifiy test ID'lari haqiqiy foydalanuvchiga to'g'ri kelmasin)                                                         | ✅    |
| T-093 | O'quvchi va ota-ona xabarlarida Mini App'ni kerakli sahifada ochadigan tugma (`web_app`): test, natija, dars, obuna, chek                                                                                | ✅    |
| T-094 | Admin o'quvchi kartasida faol obuna qachongacha ekani (uzaytirilganda eng oxirgisi)                                                                                                                      | ✅    |
| T-095 | Haftalik yoki mock testdagi savolni o'chirish 500 emas, 409 qaytaradi; FK xatosi uchun zaxira filtr                                                                                                      | ✅    |
| T-096 | Savollar bankida qidiruv: matn yoki teg bo'yicha, barcha kurslarda; haftalik va mock savol tanlagichida                                                                                                  | ✅    |
| T-097 | Kontent sahifasida savolni qidirib tahrirga o'tish (matn yoki teg, nashrda emas belgisi)                                                                                                                 | ✅    |
| T-098 | Mockdan nusxa olish: shablon va savollar ko'chadi, oyna keyingi haftaga suriladi, shablonni qayta tanlash mumkin                                                                                         | ✅    |
| T-099 | Axlat qutisi (FR-U05, BR-C06): o'chirilgan kurs, mavzu, dars va savol 30 kun tiklanadi                                                                                                                   | ✅    |
| T-100 | Excel (CSV) dan savol import: namuna fayl, oldindan tekshirish, xato qator raqami bilan, qoralama sifatida (FR-C05, BR-Q04)                                                                              | ✅    |
| T-101 | Admin'da CSV fayl tanlash o'zbekcha tugma bilan (brauzerning inglizcha "Choose File" o'rniga), offline va savol importida                                                                                | ✅    |
| T-102 | Tekshirish navbatida savol bo'yicha filtr: bitta savolni hamma o'quvchida ketma-ket baholash                                                                                                             | ✅    |
| T-103 | Mavzudagi barcha qoralama savollarni bitta tugma bilan nashr qilish (importdan keyin)                                                                                                                    | ✅    |
| T-104 | Xatolarimdan faqat xato qilingan savollar bilan qayta ishlash; bu urinishlar o'rtacha foiz, tavsiya va e'tibor signallariga kirmaydi                                                                     | ✅    |
| T-105 | Admin bosh sahifasida muvaffaqiyat o'lchovlari: oxirgi yopilgan haftalikni topshirganlar (to'liq kirishlilardan) va ota-onasi ulangan o'quvchilar                                                        | ✅    |
| T-106 | Caddy'da API so'rovlari logi faylga (deploy'dan keyin ham saqlanadi, aylanma, Authorization yashirin): production'dagi 5xx xatolarni topish uchun                                                        | ✅    |
| T-107 | Prisma zaxira filtri: takroriy yozuv (P2002) 409, poygada yo'qolgan yozuv (P2025) 404; ikki xodim bir vaqtda tiklasa yoki tahrirlasa 500 emas                                                            | ✅    |
| T-108 | Guruhning oylik davomat jadvali (o'quvchi × kun, jami sonlar, guruhdan chiqqanlar ham) va Excel'ga (CSV) yuklab olish                                                                                    | ✅    |
| T-109 | To'lovlar sahifasida oylik tushum (faqat ustozga): tasdiqlangan cheklar soni va summasi, tariflar bo'yicha, Excel'ga yuklab olish                                                                        | ✅    |
| T-110 | O'quvchilar ro'yxatida "To'lamagan" filtri (qabul qilingan, AUTO, faol obunasiz), qatorda va Excel'da obuna muddati                                                                                      | ✅    |
| T-111 | O'quvchi kartasida yopilgan haftalik testlar (ball, o'rin, topshirmagani) va oxirgi cheklar (holat, rad sababi); haftalik tarix ota-ona xulosasi bilan umumiy funksiyada                                 | ✅    |
| T-112 | O'quvchi kartasida oynasi yopilgan mock'lar: shkala balli, daraja, Rasch bo'lmasa "taxminiy" (BR-M05)                                                                                                    | ✅    |
| T-113 | O'quvchi kartasida bepul yoki yopiq rejimda kirish qadamlari hal qilmasligi tushuntiriladi (BR-A04)                                                                                                      | ✅    |
| T-114 | Ota-ona kabinetida farzandning oynasi yopilgan mock natijalari (ball, daraja, "taxminiy"); hisob o'quvchi kartasi bilan umumiy                                                                           | ✅    |
| T-115 | Bot xabarlari sekundiga 25 tadan (navbat bilan), 429 da `retry_after` kutib qayta yuborish: ommaviy xabarlar 30+ o'quvchida yo'qolmasin                                                                  | ✅    |
| T-116 | Ustozdan eʼlon: matn, kimga (o'quvchi, ota-ona, hammasi) va guruh; yuborishdan oldin soni va tasdiqlash; faqat ustoz; jurnalga matni bilan                                                               | ✅    |
| T-117 | Eʼlon sahifasida yuborilgan eʼlonlar tarixi (oxirgi 20 ta): vaqt, kimga, guruh, nechtasiga yetdi, matn; jurnaldan                                                                                        | ✅    |
| T-118 | Mock yopilishiga 24 soat qolganda topshirmagan to'liq kirishli o'quvchilarga bir marta eslatma (`MockTest.remindedAt`); qisqa oynada (12 soatdan kam ochiq) yo'q                                         | ✅    |
| T-119 | Guruh sahifasida "Guruhga eʼlon" (faqat ustozga): eʼlon sahifasi shu guruh tanlangan holda ochiladi                                                                                                      | ✅    |
| T-120 | Ota-ona farzandi uchun toʻlaydi (API): `me/children/:id/billing`, `Payment.submittedById`, ustozga "ota-onasi yubordi", natija ota-onaga ham                                                             | ✅    |
| T-121 | Ota-ona toʻlovi (Mini App): kabinetda "Obunani toʻlash", farzand uchun tarif, karta, chek, tarix; kim yuborgani koʻrinadi; adminda "Chekni ota-onasi yubordi"                                            | ✅    |
| T-122 | Ota-onaga "obuna tugayapti" va chek natijasi xabarida farzandning toʻlov sahifasini ochadigan tugma                                                                                                      | ✅    |
| T-123 | Oʻquvchi kartasi va roʻyxatida tasdiqlangan ota-ona telefoni (qoʻngʻiroq havolasi), Excel'da "Ota-ona telefoni" ustuni                                                                                   | ✅    |
| T-124 | Chek takrorlanishi: rasm SHA-256 (`Payment.receiptHash`), aynan shu chek avval yuborilgan boʻlsa ustoz navbatida ogohlantirish                                                                           | ✅    |
| T-125 | WCAG tekshiruvi: tasdiqlangan farzand kartasi va ota-onaning farzand uchun toʻlov sahifasi (tarif va karta bilan), ikkala rejimda                                                                        | ✅    |
| T-126 | Ota-ona tasdiqlanganda xabarda kabinet imkoniyatlari (obunani oʻzi toʻlashi ham) va "Kabinetni ochish" tugmasi                                                                                           | ✅    |
| T-127 | Obunasi 7 kun ichida tugaydigan (uzaytirilmagan, AUTO) oʻquvchilar: roʻyxatda "Tugayotgan" filtri, bosh sahifada eslatma                                                                                 | ✅    |
| T-128 | Chek kartasida "Tasdiqlansa obuna X gacha": tasdiqlashdagi hisob bilan bir xil (BR-B03)                                                                                                                  | ✅    |
| T-129 | Botga oddiy matn yozilsa javob: bot xabarni oʻqimaydi, savol AI yordamchiga; ilovani ochish tugmasi (faqat shaxsiy chatda)                                                                               | ✅    |
| T-130 | Eʼlon ostida ixtiyoriy "Ilovani ochish" tugmasi (standart yoqilgan)                                                                                                                                      | ✅    |
| T-131 | Mini App sahifalari `React.lazy` bilan: asosiy chunk 205 → 112 KB (gzip), KaTeX alohida                                                                                                                  | ✅    |
| T-132 | Admin sahifalari `React.lazy` bilan: asosiy chunk 220 → 110 KB (gzip)                                                                                                                                    | ✅    |
| T-133 | Bosh sahifada oʻlchov: 30 kunda mavzu testini qayta ishlaganda natija oshgan ulush (oʻquvchilar, xatolar ustida ishlashsiz)                                                                              | ✅    |
| T-134 | Mini App: pastki tab sahifalari (Darslar, Profil) brauzer boʻsh turganda oldindan yuklanadi                                                                                                              | ✅    |
| T-135 | Mini App va admin: sahifa xatosida oq ekran oʻrniga xabar va qayta urinish, menyu joyida qoladi (ErrorBoundary)                                                                                          | ✅    |
| T-136 | Toʻgʻri toʻxtash: SIGTERM API va botga yetadi (init, exec), scheduler tick'i yarmida uzilmaydi va ustma-ust tushmaydi (Ticker)                                                                           | ✅    |
| T-137 | Eʼlon: "Ota-onasi ulanmagan oʻquvchilarga" auditoriyasi va tayyor matn; bosh sahifadan havola (BR-A04 ulanish ulushi)                                                                                    | ✅    |
| T-138 | Ota-ona kabinetida hozir ochiq haftalik va mock: farzand topshirdimi, qachongacha (ballsiz, BR-PA01, BR-W08)                                                                                             | ✅    |
| T-139 | Ertalabki xulosa: Toshkent 08:00 dan keyin ustoz va yordamchiga kutayotgan ishlar soni (bot, kuniga bir marta, ish bo'lmasa yo'q)                                                                        | ✅    |
| T-140 | Admin bosh sahifasida "Ishni boshlash": kurs, dars, savol, tarif va karta, birinchi oʻquvchi; faktdan hisoblanadi, bajarilgach yoʻqoladi                                                                 | ✅    |
| T-141 | API va bot xato logida shaxsiy maʼlumot yoʻq: API'da faqat xato nomi, kodi va stack (Prisma xatosidagi ism, telefon yozilmaydi), botda Telegram xatosining yuborilgan xabarisiz                          | ✅    |
| T-142 | A11y: maʼlumotli admin sahifalari ham axe bilan (oʻquvchi kartasi, guruh, savollar, savol va dars tahriri, haftalik va tekshiruv)                                                                        | ✅    |
| T-143 | Admin bosh sahifasida o'quvchilarni taklif qilish: bot havolasi (getMe), nusxa olish va Telegramʼda ulashish                                                                                             | ✅    |
| T-144 | Zaxirani haftalik haqiqiy tiklash sinovi: vaqtinchalik konteynerga tiklab, jadvallar, migratsiyalar va foydalanuvchilar tekshiriladi                                                                     | ✅    |
| T-145 | Zaxira 36 soatdan eskirsa (cron ishlamay qolgan) admin bosh sahifasida va ertalabki xulosada ogohlantirish                                                                                               | ✅    |
| T-146 | A11y: haftalik test va mock ekranlari ikkala rejimda (savol, tanlangan javob, topshirish oynasi, kutish, yopilgandan keyingi natija)                                                                     | ✅    |
| T-147 | Admin panelga CSP va X-Frame-Options: faqat o'z fayllari, iframe ichida ochilmaydi (clickjacking); Mini App'ga tegilmaydi (Telegram Web iframe)                                                          | ✅    |
| T-148 | Server diski 85% dan ko'p band bo'lsa kunlik zaxira skripti ustozga ogohlantirish yuboradi                                                                                                               | ✅    |
| T-149 | CI daqiqalarini tejash: `main` push'da kod PR'da aynan shu holatda tekshirilgan bo'lsa lint/test/e2e takrorlanmaydi, to'g'ri deploy                                                                      | ✅    |
| T-150 | Internet uzilsa test javobi yoʻqolmaydi: navbatda qoladi, internet qaytganda oʻzi qayta yuboriladi; saqlanmaguncha topshirilmaydi; tarmoq xatosi oʻzbekcha                                               | ✅    |
| T-151 | Server javob bermasa o'zbekcha xabar: deploy paytidagi tanasiz 502/503/504 da "Server yangilanmoqda", uzilgan internetda "Internetga ulanib boʻlmadi" (Mini App va admin)                                | ✅    |
| T-152 | Deploy paytida 502 yo'q: Caddy API qayta ishga tushguncha `/api` so'rovini 30 s gacha ushlab turadi (faqat ulanmaganda qayta uriniladi, POST tanasi buferda)                                             | ✅    |
| T-153 | Admin: dars va savol muharririda saqlanmagan matn brauzerda qoladi (sessiya tugasa, sahifa yangilansa); qayta ochilganda "tiklandi" va "Bekor qilish"; boshqa tabda qayta kirilsa shu tab o'zi qaytadi   | ✅    |
| T-154 | Haqiqiy Excel (.xlsx): savol va offline natija importi .xlsx ni qabul qiladi, barcha eksport va namuna fayl .xlsx (matn formatli ustunlar, qalin sarlavha); faqat `fflate`                               | ✅    |
| T-155 | Yordamchini havola bilan taklif qilish: ustoz Sozlamalarda havola yaratadi (24 soat, bir marta), odam botda ochishi bilan yordamchi boʻladi; avval botga kirgan boʻlishi shart emas                      | ✅    |
| T-156 | Admin AI agenti (FR-Y05, BR-T05, ADR-0006): ustoz oddiy soʻz bilan yozadi, agent panel amallarini oʻz huquqi bilan bajaradi, oʻzgartirish faqat tasdiqdan keyin                                          | ✅    |
| T-157 | Excel fayldan haftalik test: savol tanlagichda «Excel fayldan» rejimi, savollar mavzuga qoralama boʻlib saqlanib darhol testga qoʻshiladi                                                                | ✅    |
| T-158 | Mini App'dan to'g'ridan-to'g'ri admin panel: xodim initData bilan kiradi (1 soatgacha), o'quvchi ko'rinishi havolasi                                                                                     | ✅    |
| T-159 | DeepSeek provayderi (`AI_PROVIDER=deepseek`): AI yordamchi va admin agenti; yechim rasmi ustoz navbatiga (DeepSeek rasm o'qimaydi)                                                                       | ✅    |
| T-160 | Deploy oldingi deploy tugashini kutadi (12 daqiqagacha): ketma-ket merge'larda deploy yiqilmaydi                                                                                                         | ✅    |
| T-161 | Maslahatchi: bosh sahifada sinf va platforma bo'yicha faktli tavsiyalar (qiyin mavzu, haftalik reja, testsiz mavzu, qatnashish)                                                                          | ✅    |
| T-162 | Statistika sahifasi: oy bo'yicha o'quvchilar, davomat, mavzu va haftalik natijalar, eng yaxshilar, 8 haftalik faollik                                                                                    | ✅    |
| T-163 | AI holati: provayder xatosi agentda sababi bilan 503 (pul tugagan, kalit), bosh sahifada 'AI ishlamayapti' ogohlantirishi                                                                                | ✅    |
| T-164 | AI agent: statistika, maslahatlar, guruh tarkibi va oylik davomatni o'qiydi; davomatni tasdiq bilan belgilaydi                                                                                           | ✅    |
| T-165 | Eski Excel (.xls) va HTML jadval yuklash (offline natija, savollar); fayl turi ichidan aniqlanadi                                                                                                        | ✅    |
| T-166 | Landing: sayt Telegram'dan tashqarida ochilsa platforma haqida sahifa va bot tugmasi; ochiq /api/public/landing                                                                                          | ✅    |
| T-167 | Audit: matn bir xilligi (Excelʼ, yechim rasmi), BR-Q02/P01/P04 holati ✅, BR ID test nomlarida                                                                                                           | ✅    |
| T-168 | Xodim Mini App'ni ochsa har doim admin panel: o'quvchi ko'rinishi (?view=student) olib tashlandi                                                                                                         | ✅    |
| T-169 | O'quvchi Asosiy sahifasida 'Mening yutuqlarim': faollik seriyasi, 7 kunlik grafik, mavzu o'zlashtirish, aniqlik, haftalik o'rni, davomat, nishonlar; /me/progress                                        | ✅    |
| T-170 | AI yordamchiga rasm: yuklash, DeepSeek vision (deepseek-flash), ochiq test himoyasi (BR-T06), ustoz rasmni ko'radi                                                                                       | ✅    |
| T-171 | Mini App: yordamchiga rasm tugmasi (siqib yuklash, ko'rinish, xatoda qoladi); admin suhbatda rasm                                                                                                        | ✅    |
| T-172 | Tezlik: shared `sideEffects:false` (Mini App va admin asosiy bundle gzip 115→84 KB), onboarding lazy, urinishlarga `(userId, submittedAt)` indeks, yutuqlar faqat topshirilgan haftaliklarni o'qiydi     | ✅    |
| T-173 | Professional sayt: `apps/landing` statik HTML (SEO teglari, JSON-LD, FAQ), `sitemap.xml`, `sitemap.html`, `robots.txt`; asosiy domen (`LANDING_HOST`), www → sayt; BR-T05 dublikati: rasm qoidasi BR-T06 | ✅    |
| T-174 | Oq ekran: deploydan keyin yo'q asset `index.html` (200, 1 yil kesh) o'rniga keshsiz 404; sahifa manzillari `no-cache`; Mini App asosiy skripti yuklanmasa bir marta qayta yuklanadi                      | ✅    |
| T-175 | Kompyuterda ustozga brauzer tugmasi (T-176 bilan almashtirildi)                                                                                                                                          | ✅    |
| T-176 | Admin CSP `frame-ancestors 'self' https://web.telegram.org`, `X-Frame-Options` yo'q: Telegram Desktop (Wayland) va Web iframe'ida ustoz panelga Mini App ichida o'tadi                                   | ✅    |
| T-177 | Admin: AI bitta «AI yordamchi» bo'limida (`/ai`): buyruq va savol, o'quvchilar suhbatlari; agent suhbatlarni o'qiydi va tahlil qiladi; eski `/agent`, `/tutor` yangi manzilga o'tadi                     | ✅    |
| T-178 | Ilova va admin Google natijalarida chiqmaydi: `X-Robots-Tag: noindex` (Caddy) va meta; ilova `robots.txt` sahifalarni yopmaydi, aks holda noindex o'qilmaydi                                             | ✅    |
| T-179 | Zaxira bucket nomi server `.env` dagi `BACKUP_BUCKET` dan o'qiladi (akkaunt ko'chgach eski bucket'ga yozib, AccessDenied bo'lgan); yozilmagan bo'lsa zaxira xato xabari bilan to'xtaydi                  | ✅    |
| T-180 | Offline test fayli (ona tili loyihasidagidek, essesiz): skaner (OMR) eksporti va Q1..Qn matritsa parseri, fan bo'limlari (`Nom: 1-10, 31`), Rasch bahosi                                                 | ✅    |
| T-181 | Offline API qayta qurildi: har savol javobi, ball va daraja (faol shablon), fan bo'limlari tahriri, tahlil (mediana, taqsimot, har savol, Rasch), reyting, xabar yuborish                                | ✅    |
| T-182 | Admin offline: import (fayl, nom, sana, guruh, fan bo'limlari, oldindan ko'rish), testlar ro'yxati va reyting tabi                                                                                       | ✅    |
| T-183 | Admin offline test sahifasi: darajalar, bo'limlar o'rtachasi, eng ko'p xato savollar, har savol, Rasch jadvali, natijalar, natija kartasi, biriktirish                                                   | ✅    |
| T-184 | Mini App offline natija sahifasi: ball, daraja, o'rin, fan bo'limlari, eng zaif bo'lim, har savol; ota-ona ham ko'radi                                                                                   | ✅    |
