# Samarqand matematika: Telegram Mini App (reja, qoralama)

> Holat: **qoralama, tasdiqlanmagan**. Sana: 2026-11-19. Ochiq savollar oxirgi bo'limda.
> `skdmath` faqat papka nomi. Loyiha nomi **Samarqand matematika**.

## 1. Kontekst

Ustoz **Komil Sobirov** va shogirdlari (yordamchilar, `ASSISTANT` roli) uchun matematika fanidan ta'lim platformasi. Ustoz ismi kodda yozilmaydi: brend va watermark sozlamadan (`AppSetting` yoki `.env`) olinadi. GitHub repo **private**. Auditoriya: abituriyentlar va o'quvchilar (online va offline guruhlar).
Asos sifatida `~/projects/sherzodabduxalimov` (ona tili) olinadi: arxitektura, rollar, oqimlar va biznes qoidalar asosan bir xil.
Lekin kod **noldan** yoziladi. Eski koddan faqat kerakli bo'laklar ko'rib chiqilib olinadi. Intizom qoidalari (ona tilida F0–F6 rejasi sifatida kech qo'shilgan) **birinchi commitdanoq** ishlaydi.

### Ona tilidan farqi (asosiy)

| Ona tili                                | Samarqand matematika                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Esse, AI baholaydi va ustoz tasdiqlaydi | **Yechim rasmi**: o'quvchi daftardagi yechimni yuklaydi, AI tekshiradi va ustoz tasdiqlaydi |
| Matnli savollar                         | **Formulalar** (LaTeX, KaTeX), chizmalar, son va ifoda ko'rinishidagi javoblar              |
| Mavzu testi va Mock                     | Mavzu testi, Mock (Milliy sertifikat) va **haftalik test** (1 hafta muddat)                 |
| AI faqat ustoz uchun                    | **O'quvchining AI yordamchisi**: javobni ko'chirib berish o'rniga o'rgatadi                 |
| Advisor (ustoz uchun)                   | Advisor va **o'quvchi uchun shaxsiy ko'rsatmalar**                                          |

## 2. Texnologiyalar

| Qatlam             | Tanlov                                                                                          | Izoh                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Monorepo           | pnpm workspaces + Turborepo                                                                     | ona tilidagidek                                      |
| Mini App           | React 18, Vite, TS, `@telegram-apps/sdk-react`, TanStack Query, Zustand, React Router, Tailwind |                                                      |
| Admin              | React, Vite, shadcn/ui, TanStack Table                                                          | telefonda ham ishlaydi (ona tilidagi tajriba)        |
| UI                 | `packages/ui-tokens` (Tailwind preset) + `packages/ui` (umumiy komponentlar)                    | birinchi kundan umumiy                               |
| Formula ko'rsatish | **KaTeX**                                                                                       | tez ishlaydi, SSR shart emas                         |
| Formula kiritish   | **MathLive** (`<math-field>`)                                                                   | admin muharriri va o'quvchining ifoda javobi uchun   |
| Javobni tekshirish | **CortexJS Compute Engine** (MathLive bilan bitta oiladan)                                      | `3/4 = 0.75`, `2x+2 = 2(x+1)`: serverda tekshiriladi |
| Backend            | NestJS (Fastify), REST + OpenAPI, Zod                                                           | dev rejimda swc ishlatiladi, tsx emas                |
| DB                 | PostgreSQL 16 + Prisma                                                                          |                                                      |
| Navbat / cron      | Redis + BullMQ                                                                                  | AI tekshiruv, haftalik test oynalari, hisobotlar     |
| Bot                | grammY                                                                                          | bitta bot, bitta nusxa                               |
| Fayllar            | S3-mos saqlash (R2 yoki MinIO), yoki diskdagi `MEDIA_DIR`                                       | yechim rasmlari ko'p bo'ladi, hajm rejalashtiriladi  |
| Rasm               | Kliyentda siqish (≤1600px, WebP yoki JPEG), serverda `sharp`                                    |                                                      |
| Word import        | **pandoc** (docx: OMML formulalari → LaTeX)                                                     | MathType obyektlari: xavf, §9 ga qarang              |
| AI                 | `AiProvider` interfeysi. Provayder **keyin tanlanadi** (ADR-ochiq)                              | vision kerak: qo'lyozma yechimni o'qiydi             |
| Video              | ffmpeg, AES-128 HLS, HMAC token, belgi (watermark)                                              | ona tilidagi yechim                                  |
| Deploy             | Docker Compose, **alohida server va domen**, o'z Caddy'si                                       |                                                      |
| Test               | Vitest (unit), API e2e, Playwright (smoke, UI audit)                                            |                                                      |

## 3. Monorepo tuzilishi

```
apps/
  api/        # NestJS: REST va worker (AI, video, cron)
  bot/        # grammY
  miniapp/    # o'quvchi va ota-ona
  admin/      # ustoz va yordamchilar
packages/
  db/         # Prisma
  shared/     # Zod sxemalar, tiplar, rollar, baholash (Rasch, milliy sertifikat), javob solishtirish
  math/       # KaTeX/MathLive o'ramlari, LaTeX sanitizatsiya, ekvivalentlik
  ui-tokens/  # ranglar, shrift, radius
  ui/         # Button, Card, Dialog, Skeleton, EmptyState, MathText ...
docs/         # 00-vision ... 12-ai-playbook, adr/
infra/        # Caddy, backup, server-setup
scripts/      # staging.sh, deploy.sh, ui-audit.ts
```

## 4. Rollar

Ona tilidagidek: `STUDENT` (online/offline), `PARENT`, `ASSISTANT`, `TEACHER` (owner). RBAC faqat backend'da tekshiriladi: global `AuthGuard`, `@Roles()`, `@Public()`.
Ota-ona tasdig'i to'liq kirish uchun majburiy (ona tilidagi qoida). Qolgan farqlar ish davomida aniqlanadi.

## 5. Asosiy modullar

### 5.1 Kontent va savollar banki

- Kurs → Mavzu → Dars (video, konspekt LaTeX bilan, fayllar, mavzu testi).
- Savol turlari: `SINGLE`, `MULTIPLE`, `NUMERIC` (son yoki kasr, tolerantlik bilan), `EXPRESSION` (ifoda, ekvivalentlik bo'yicha tekshiriladi), `MATCHING`, `WRITTEN` (yozma yechim, rasm bilan).
- Har savolda: matn (Markdown va LaTeX), rasm yoki chizma, **namunaviy yechim** (AI tekshiruvi uchun etalon), mavzu, qiyinlik, ko'nikma teglari (masalan "kvadrat tenglama", "Viet teoremasi").
- Admin muharriri: MathLive va jonli preview. Excel yoki Word'dan import (pandoc), "AI bilan tekshirish" (savoldagi xato, javob kalitining to'g'riligi).

### 5.2 Testlar

| Tur                          | Qoida                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Mavzu testi                  | Istalgan vaqtda, mashq rejimi. AI ishora berishi mumkin                                                     |
| Mock (Milliy sertifikat)     | Yopiq va ochiq qismlar, vaqt server bo'yicha hisoblanadi, Rasch, A+…C darajalar. Test paytida AI **o'chiq** |
| **Haftalik test**            | §6 ga qarang                                                                                                |
| Offline test (tashqi import) | Skaner va Excel natijalari, bo'limlar bo'yicha natija (farqlari ish davomida aniqlanadi)                    |

To'g'ri javoblar test yopilguncha kliyentga yuborilmaydi.

### 5.2.1 Milliy sertifikat (matematika) formati: ikkilamchi manbalar, **rasmiy UzBMB spetsifikatsiyasi bilan tekshirilishi kerak**

| Parametr    | Ma'lumot                                                                                                                                                                                                                                         | Ishonch                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Savollar    | 45 ta: ~35 yopiq va ~10 ochiq                                                                                                                                                                                                                    | o'rta (manbalar har xil)                    |
| Vaqt        | 150 daqiqa                                                                                                                                                                                                                                       | yuqori (UzBMB spetsifikatsiyasidan iqtibos) |
| Turlar      | Y-1: 4 variantli, bitta javob · Y-2: moslashtirish (A–F, 3 kichik savol, faqat hammasi to'g'ri bo'lsa ball beriladi) · O: qisqa ochiq javob, a va b qismlari alohida baholanadi                                                                  | yuqori                                      |
| Xom ball    | qiyinlik bo'yicha 1.3 / 2.2 / 3.2 (ochiq 3.2), jami ~100                                                                                                                                                                                         | o'rta                                       |
| Shkala      | Rasch, 75 ballik T-shkala (50 = o'sha imtihon qatnashchilarining o'rtachasi)                                                                                                                                                                     | yuqori                                      |
| Darajalar   | A+ 70–75 · A 65–69.9 · B+ 60–64.9 · B 55–59.9 · C+ 50–54.9 · C 46–49.9 · 46 dan past bo'lsa sertifikat berilmaydi                                                                                                                                | o'rta                                       |
| Mavzular    | arifmetika va sonlar nazariyasi, algebraik ifodalar, tenglama va tengsizliklar, funksiya va grafik, trigonometriya, progressiyalar, planimetriya, stereometriya, kombinatorika va ehtimollik, analiz elementlari (hosila, boshlang'ich funksiya) | o'rta                                       |
| Kalkulyator | ruxsat yo'q                                                                                                                                                                                                                                      | o'rta                                       |

Loyiha uchun xulosa:

- Mock tuzilmasi va ballar **kodga qotirilmaydi**. Ular "imtihon shabloni" sozlamasida turadi: bo'limlar, savol turlari, ballar va daraja chegaralari. Format o'zgarsa, kod emas, shablon o'zgartiriladi.
- Kichik guruhda Rasch o'rtachasi ishonchsiz chiqadi. Shuning uchun natija xom balldan taxminiy darajaga o'tkaziladi va "taxminiy" deb belgilanadi (ona tilidagi tajriba).
- Mavzu va ko'nikma teglari yuqoridagi 10 ta yo'nalish bo'yicha boshlanadi.

### 5.3 Davomat, guruhlar, ota-ona, to'lovlar, video

Ona tilidagidek: davomat va ota-onaga xabar, qo'lda to'lov (chek), keyin Click va Payme (`PaymentProvider`), obuna, himoyalangan HLS, zaxira, axlat qutisi, audit log.

## 6. Haftalik test va yechimni tekshirish (asosiy farq)

**Maqsad:** o'quvchi o'zi ishlashi va ko'chirmasligi.

Oqim:

1. Ustoz haftalik testni e'lon qiladi. Oyna **1 hafta** ochiq turadi, masalan dushanba 00:00 dan yakshanba 23:59 gacha (BullMQ cron ochadi va yopadi). Testlar har kuni emas, haftasiga bitta bo'ladi.
2. O'quvchi hafta davomida istalgan vaqtda ishlaydi, topshirish bitta.
3. Javoblarni belgilaydi, keyin **har bir savolga yechim rasmini yuklaydi** (1–3 rasm).
4. **BR (qoralama):** javob va yechim **oyna yopilguncha** yuklanib, tekshiruvga topshirilgan bo'lishi kerak. Aks holda ball **0** bo'ladi. To'g'ri javob belgilangan, lekin yechimi yuklanmagan savol ham 0 hisoblanadi. AI tekshiruvi topshirish bilanoq boshlanadi, shuning uchun baho oyna ichida chiqadi. Oyna yopilishiga oz qolganda ilova va bot eslatma yuboradi (masalan 24 va 3 soat qolganda).
5. Topshirilgach AI tekshiruvi navbatga tushadi (asinxron, qayta urinish bilan).
6. AI har bir savol bo'yicha **tuzilgan hukm** qaytaradi (JSON sxema):
   - `verdict`: `SOLVED_CORRECTLY` · `RIGHT_ANSWER_WRONG_METHOD` · `INCOMPLETE` · `WRONG` · `SUSPECTED_COPY` · `UNREADABLE` · `NO_SOLUTION`
   - qadamlar bo'yicha tahlil: qaysi qadam to'g'ri, qaysi birida xato bor
   - belgilangan javob yechimdan haqiqatan kelib chiqadimi
   - ko'chirish belgilari va ishonch darajasi (confidence)
7. **Ko'chirishni aniqlash** bir nechta signalni birga ko'radi (bitta signalga tayanilmaydi):
   - yechim belgilangan javobga olib kelmaydi, ya'ni javob boshqa joydan olingan;
   - qadamlar tashlab ketilgan: oraliq hisob-kitob yo'q, faqat tayyor natija bor;
   - AI chatbotlarga xos uslub: ortiqcha "chiroyli" yozuv, o'quvchi darajasiga mos kelmaydigan usul yoki belgilash;
   - **o'quvchilar orasida o'xshashlik**: bir xil xato, bir xil noodatiy usul (serverda solishtiriladi);
   - o'quvchining o'z tarixi bilan farqi: mavzu testlarida 40% olgan o'quvchi haftalikda birdan 100% olsa.
8. **BR (tasdiqlangan): shubha o'quvchiga ko'rsatilmaydi.** AI "shubhali" desa, savol o'quvchiga hech qanday belgisiz **ustozning navbatiga** tushadi. Ustoz yechimni o'zi ko'rib qaror qiladi. O'quvchi faqat yakuniy natijani ko'radi.
9. **Oxirgi so'z ustozda**: AI hukmi taklif xolos. Shubhali savollar navbatda birinchi turadi. Shubhasiz hukmlar avtomatik qo'llanishi mumkin (ustoz istalgan payt o'zgartira oladi). AI o'chiq bo'lsa ham oqim ishlayveradi.
10. Oyna yopilgach: ball, reyting, ota-onaga hisobot, o'quvchiga xatolarning tushuntirishi.

**Og'zaki himoya (yozma)** rad etildi: o'quvchi AI bergan qo'shimcha savolni ham boshqa AI'ga tashlab javob olishi mumkin. Muqobillar keyin ko'riladi: ovozli javob va qisqa taymer (Telegram voice), yoki ustoz shubhali o'quvchidan darsda jonli so'raydi.

## 7. O'quvchining AI yordamchisi

**Muammo:** o'quvchilar oddiy chatbotlardan tayyor javobni ko'chirib olishyapti.
**Yechim:** platformaning ichidagi yordamchi o'quvchini **o'rgatadi**, javobni bermaydi. U kontekstni biladi: qaysi savol, qaysi test, qaysi rejim.

| Rejim                                | Yordamchi nima qiladi                                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dars va mavzu mashqi                 | Sokratik usulda ishlaydi: ishora darajalari bilan (1. qaysi formula kerak → 2. birinchi qadam → 3. qadamni tekshirish). To'liq yechimni faqat o'quvchi o'zi urinib ko'rgandan keyin ko'rsatadi |
| Haftalik test va Mock (ochiq paytda) | **O'chiq.** Savol matni yordamchiga yuborilmaydi. Yordamchi bank savollarini taniydi va ochiq testdagi savolni yechib bermaydi                                                                 |
| Test yopilgandan keyin               | Har bir xato bo'yicha qadam-baqadam tushuntiradi: "sening yechimingda 2-qadamda xato bor" (o'quvchining o'z rasmi asosida)                                                                     |
| Erkin savol                          | Mavzu bo'yicha tushuntiradi. Masala rasmini yuborsa, avval "sen nima qilib ko'rding?" deb so'raydi                                                                                             |

- Ishora ishlatilgani qayd etiladi (statistika uchun, ball ham kamayishi mumkin: ochiq savol).
- Har o'quvchiga kunlik limit qo'yiladi (xarajat nazorati). Barcha suhbatlar saqlanadi, ustoz ko'ra oladi.
- Tizim prompti va qoidalar serverda turadi. Kliyent "javobni ayt" desa ham, rejim qoidasi ustun turadi.

### 7.1 Shaxsiy ko'rsatmalar

- **Faktlarga asoslanadi** (ona tilidagi advisor tamoyili, umumiy gap yo'q): mavzu va ko'nikma bo'yicha natijalar, haftalik dinamika, ko'chirish belgilari, davomat.
- O'quvchi uchun: "shu hafta 3 ta ish: Viet teoremasi (5 tadan 2 tasi to'g'ri) → dars X, mashq Y".
- Ustoz uchun: kim qayerda orqada qolyapti, kimda ko'chirish belgilari bor, guruhlar solishtiruvi.
- AI faqat aniq ish bajaradigan joyda ishlatiladi (yechimni tekshirish, xatoni tushuntirish). Qoidaga asoslangan tavsiyalar ustiga AI xulosasi qo'shilmaydi.

## 8. Qoidalar va intizom (birinchi kundan)

- **ESLint strict** (typescript-eslint, react-hooks), fayl **≤300 qator**, funksiya **≤60 qator**, paket chegaralari (miniapp va admin `@db` ni import qilmaydi).
- **Prettier**, **husky + lint-staged**, **commitlint** (conventional commits).
- **CI**: format, lint, typecheck, test, build, Prisma drift, docker build. `main` faqat yashil CI bilan.
- Bog'liqliklar aniq versiyalarga qotiriladi, `minimumReleaseAge`, Renovate.
- **Hujjat manba**: `docs/00-vision`, `01-requirements` (FR-_), `02-roles-permissions`, `03-architecture`, `04-business-rules` (BR-_), `05-data-model`, `07-quality` (DoD), `09-tasks` (T-*), `10-open-questions`, `11-ux`, `12-ai-playbook`, `adr/`. BR o'zgargan PR'da hujjat ham yangilanadi, test nomida BR ID turadi.
- `CLAUDE.md`, `/task` buyrug'i.
- **Repoga shaxsiy ma'lumot tushmaydi** (karta, telefon, ism, token): ular `.env` da turadi. Demo yoki soxta ma'lumot yo'q.
- Ish tartibi: feature branch → staging (test bot) → PR → `main` → avtomatik deploy (faqat yashil CI).
- Interfeys to'liq o'zbek tilida (lotin), i18n tuzilmasi tayyor turadi. Mobile-first, 360px, 44px tugmalar, Telegram `themeParams`.

### 8.1 Dizayn: brend rangi **ko'k** (ustoz tanlovi, 2026-11-19)

Ona tilida brend to'q yashil va oltin edi. Bu loyihada **ko'k** bo'ladi. Tuzilma o'shandagidek: ranglar CSS o'zgaruvchilarida `"r g b"` formatida turadi, `packages/ui-tokens` dagi Tailwind preset ularni o'qiydi, kodda hex rang yozish lint bilan taqiqlanadi.

| Token                           | Kunduzgi                         | Tungi (Telegram dark)  | Izoh                                                                                                                                  |
| ------------------------------- | -------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `--c-brand`                     | `30 64 175` (#1E40AF, to'q ko'k) | `59 118 225` (#3B76E1) | tungi variant ochroq, chunki to'q ko'k qora fonda ko'rinmaydi. Kontrast oq matn bilan ham, qorong'i fon bilan ham ≥4:1 bo'lishi kerak |
| `--c-accent`                    | `180 120 20` (amber)             | `240 200 120`          | ikkinchi rang (yutuq, reyting, belgilar uchun). Ko'k bilan yaxshi ajraladi. Tasdiqlanishi kerak                                       |
| neytrallar, `danger`, `success` | Telegram `themeParams` dan       |                        | ona tilidagidek                                                                                                                       |

- Aniq ranglar 0-bosqichda `/_kit` sahifasida Telegram ichida (kunduzgi va tungi rejim) ko'rsatilib, ustoz bilan tasdiqlanadi. Kontrast WCAG AA (axe) bilan tekshiriladi.
- Shriftlar: matn uchun Manrope (`oʻ gʻ` to'g'ri chiqadi). Formulalar KaTeX shriftida bo'ladi. Sarlavha shrifti ko'k uslubga mos tanlanadi.

## 9. Xavflar

| Xavf                                                      | Chora                                                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Word'dagi MathType formulalari (OLE) pandoc'da o'qilmaydi | Shablon: Word'ning o'z formula muharriri (OMML) yoki Excel'da LaTeX. MathType uchun alohida konvertor keyin |
| AI qo'lyozmani noto'g'ri o'qiydi                          | `UNREADABLE` hukmi, ishonch darajasi, ustoz tasdig'i. AI hech qachon yakuniy baho qo'ymaydi                 |
| AI ko'chirishni noto'g'ri ayblaydi (false positive)       | Faqat "shubha" deb belgilanadi, ayblov yo'q. Ustoz qaror qiladi, o'quvchiga signal ko'rsatilmaydi           |
| AI xarajati                                               | Kunlik limitlar, model darajalari (oddiy ish arzon model, rasm kuchli model), navbat, keshlash              |
| Yechim rasmlari hajmi                                     | Kliyentda siqish, saqlash siyosati (masalan 1 yildan keyin arxiv)                                           |
| Web-ilovada skrinshotni to'liq to'sib bo'lmaydi           | Watermark (ona tilidagi kabi)                                                                               |

## 10. Bosqichlar

- **0. Poydevor (1 hafta)**: repo, lint/prettier/husky/commitlint/CI, hujjatlar skeleti, Docker, Prisma sxemasi, Telegram auth (initData → JWT), bot `/start`, Mini App va admin skeletlari, `packages/ui` va `packages/math` (KaTeX).
- **1. MVP (3–4 hafta)**: kurs, mavzu va dars; savollar banki (LaTeX muharriri, son va ifoda javoblari); mavzu testlari; Asosiy va Profil; qo'lda to'lov va obuna; ota-ona tasdig'i.
- **2. Haftalik test va AI (3 hafta)**: haftalik oyna, yechim yuklash, AI tekshiruvi va ko'chirish signallari, ustoz navbati, reyting, ota-onaga hisobot. `AiProvider` va provayder tanlovi (ADR).
- **3. AI yordamchi (2 hafta)**: rejimga qarab ishlaydigan tutor, ishora darajalari, xatoni tushuntirish, limitlar.
- **4. Mock va offline (2–3 hafta)**: Milliy sertifikat formati, Rasch, offline guruhlar, davomat, tashqi test importi (bo'limlar bo'yicha).
- **5. Ko'rsatmalar (1–2 hafta)**: o'quvchi va ustoz uchun faktlarga asoslangan tavsiyalar.
- **6+**: Click va Payme, himoyalangan video, og'zaki himoya, gamification.

## 11. Tekshirish

- Har bosqich: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` yashil bo'ladi.
- Javob ekvivalentligi uchun jadvalli unit testlar (`3/4`, `0,75` (vergul bilan), `-0.5`, `\frac{1}{2}`, `2(x+1)`).
- AI tekshiruvi uchun **baholash to'plami**: ustoz tayyorlagan real yechimlar (to'g'ri, xato, ko'chirilgan). Har prompt yoki model o'zgarganda aniqlik o'lchanadi.
- Staging'da Telegram ichida real oqim sinaladi: ustoz haftalik test e'lon qiladi, o'quvchi yechib rasm yuklaydi, AI hukm beradi, ustoz tasdiqlaydi, ota-onaga xabar boradi.

## 12. Hal qilingan qarorlar (2026-11-19)

- Ustoz: Komil Sobirov va shogirdlari. Repo private. Alohida server va domen.
- Kod noldan yoziladi, intizom birinchi kundan.
- Yechim rasmini AI tekshiruvi birinchi kundan bo'ladi (2-bosqichda, haftalik test bilan birga).
- Haftalik test: 1 hafta oyna. Shu muddatda topshirilib baholanmagan bo'lsa ball 0.
- AI shubhasi o'quvchiga ko'rsatilmaydi, faqat ustozga boradi.
- Yozma og'zaki himoya rad etildi.
- AI provayderi keyin tanlanadi.
- Brend rangi ko'k (ona tilida yashil edi). Aniq ranglar 0-bosqichda tasdiqlanadi (§8.1).

## 13. Ochiq savollar

1. Domen, server (qayer, qancha resurs), bot nomi.
2. Paket nomlari prefiksi (`@samarqand/*` taklif qilinadi).
3. AI provayderi: vision kerak. Claude, Gemini yoki GPT orasidan 2-bosqichda baholash to'plami bilan solishtirib tanlanadi.
4. Haftalik test: boshlangandan keyin ichki vaqt limiti bormi yoki faqat haftalik oyna bormi? 0 ball qoidasi butun testga qo'llanadimi yoki faqat yechimi yo'q savolgami (taklif: savolga)?
5. AI yordamchi ishora bersa, ball kamayadimi?
6. AI yordamchiga kunlik limit qancha (savollar soni)?
7. Tariflar: AI yordamchi barcha tariflarga kiradimi yoki alohida pullikmi?
8. Offline test natijalarining bo'limlar bo'yicha formati qanday? (ish davomida aniqlanadi)
9. Milliy sertifikat formati rasmiy UzBMB PDF'i bilan tekshirilishi kerak (§5.2.1). Hujjatlarda PDF'ning havolasi va tekshirilgan sanasi yoziladi.
