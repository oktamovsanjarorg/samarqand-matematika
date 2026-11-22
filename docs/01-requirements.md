# 01: Funksional talablar (FR)

> Har talabga ID beriladi. Batafsil qoidalar `04-business-rules.md` da (BR), vazifalar `09-tasks.md` da (T).
> ✅ bajarilgan · 🟨 qisman · ⬜ hali yo'q

## Kirish va profil (FR-A)

| ID     | Talab                                                                                                         | BR               | T            | Holat |
| ------ | ------------------------------------------------------------------------------------------------------------- | ---------------- | ------------ | ----- |
| FR-A01 | Mini App'ga Telegram orqali parolsiz kirish; ustoz va yordamchi admin panelga botdagi `/admin` havolasi bilan | BR-A01..A03      | T-010        | ✅    |
| FR-A02 | O'quvchi onboarding: ism-familiya va telefon (bot tugmasi orqali)                                             | BR-S01, S02, S04 | T-020        | ✅    |
| FR-A03 | Ustoz o'quvchini qabul qiladi, kirish rejimini (AUTO, FREE, CLOSED) tanlaydi; o'quvchiga xabar boradi         | BR-S03, BR-A04   | T-020, T-081 | ✅    |
| FR-A04 | Ota-ona `/ota` havolasi va o'z raqami bilan ulanadi, ustoz tasdiqlaydi, shubha belgilari ko'rinadi            | BR-S05, S06      | T-020, T-073 | ✅    |
| FR-A05 | Ustoz yordamchi tayinlaydi va olib tashlaydi                                                                  | BR-A05           | T-086        | ✅    |

## Kontent va savollar (FR-C)

| ID     | Talab                                                                                                              | BR             | T            | Holat |
| ------ | ------------------------------------------------------------------------------------------------------------------ | -------------- | ------------ | ----- |
| FR-C01 | Kurs → mavzu → dars: yaratish, tartiblash, nashr, o'chirish; konspekt Markdown va LaTeX bilan, jonli ko'rinish     | BR-C01..C04    | T-021        | ✅    |
| FR-C02 | Bepul va pullik dars; pullik dars to'liq kirish bilan ochiladi                                                     | BR-C02, BR-A04 | T-021        | ✅    |
| FR-C07 | Yangi dars haqida o'quvchilarga bot xabari (ustoz tugmasi bilan)                                                   | BR-C05         | T-091        | ✅    |
| FR-C03 | Savollar banki: 6 tur, namunaviy yechim, qiyinlik, ko'nikma teglari; matn va teg bo'yicha qidiruv                  | BR-Q01..Q03    | T-022, T-096 | ✅    |
| FR-C04 | Javobni avtomatik tekshirish: son (kasr, vergul), ifoda (ekvivalentlik), moslashtirish; qolganini ustoz tekshiradi | BR-M04, BR-Q03 | T-014, T-074 | ✅    |
| FR-C05 | Excel (CSV) dan savol import (T-100); Word'dan import (T-026, pandoc kerak)                                        | BR-Q04         | T-100, T-026 | 🟨    |
| FR-C06 | Darsda himoyalangan video (HLS, belgi)                                                                             |                |              | ⬜    |

## Testlar (FR-T)

| ID     | Talab                                                                                                                   | BR               | T                   | Holat |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------- | ----- |
| FR-T01 | Mavzu testi: mashq, qayta ishlash, topshirgach to'g'ri javob va yechim                                                  | BR-P01..P05      | T-023               | ✅    |
| FR-T02 | Haftalik test: 1 haftalik oyna, bitta urinish, har savolga yechim rasmi, topshirmaganga 0                               | BR-W01..W04, W09 | T-030, T-031        | ✅    |
| FR-T03 | Haftalik test ochilganda xabar, yopilishiga 24 va 3 soat qolganda eslatma                                               | BR-W07           | T-030, T-080        | ✅    |
| FR-T04 | AI yechimni tekshiradi (hukm, qadamlar, ko'chirish signallari); shubha faqat ustozga                                    | BR-W05, W06      | T-032, T-033        | ✅    |
| FR-T05 | Ustoz navbati: shubhali va qo'lda tekshiriladigan javoblar birinchi, ball va izoh; yopilganda ustozga hisobot           | BR-W05, W06      | T-034, T-084        | ✅    |
| FR-T06 | Reyting: test bo'yicha va umumiy; natija oyna yopilgandan keyin                                                         | BR-W08, W10      | T-035               | ✅    |
| FR-T07 | Mock (Milliy sertifikat): shablon, bo'limlar, server vaqti, avtomatik topshirish, Rasch yoki taxminiy ball, daraja      | BR-M01..M07      | T-050..T-053        | ✅    |
| FR-T08 | Offline test natijalarini CSV'dan import qilish va o'quvchiga moslash                                                   | BR-G04           | T-056               | ✅    |
| FR-T09 | Natijalarni Excel'ga (CSV) yuklab olish: haftalik, mock, o'quvchilar ro'yxati                                           |                  | T-076, T-078        | ✅    |
| FR-T10 | "Xatolarim": oxirgi javobi xato savollar to'g'ri javob va yechim bilan; Asosiy'da turtki; faqat xatolarni qayta ishlash |                  | T-079, T-083, T-104 | ✅    |

## AI yordamchi (FR-Y)

| ID     | Talab                                                                                    | BR          | T            | Holat |
| ------ | ---------------------------------------------------------------------------------------- | ----------- | ------------ | ----- |
| FR-Y01 | Mashqda Sokratik yordamchi: avval ishora, to'liq yechim urinishdan keyin                 | BR-T02      | T-040, T-041 | ✅    |
| FR-Y02 | Ochiq haftalik test va mock savollari bo'yicha yordam yo'q; mock paytida butunlay o'chiq | BR-T01, M06 | T-040        | ✅    |
| FR-Y03 | Test yopilgach "Xatoni tushuntir": o'quvchining rasmi va ustoz izohi asosida             |             | T-043        | ✅    |
| FR-Y04 | Kunlik limit; barcha suhbatlar saqlanadi, ustoz ko'radi                                  | BR-T03, T04 | T-040, T-042 | ✅    |

## Guruhlar, davomat, ota-ona (FR-G)

| ID     | Talab                                                                                                                               | BR          | T                   | Holat |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------- | ----- |
| FR-G01 | Offline guruhlar va a'zolar                                                                                                         | BR-G01      | T-054               | ✅    |
| FR-G02 | Davomat; kelmagan yoki kechikkanda ota-onaga xabar, tuzatish xabari; oylik jadval va Excel                                          | BR-G02, G03 | T-055, T-108        | ✅    |
| FR-G03 | Ota-ona kabineti: farzandlar, davomat, natijalar (mavzu, haftalik, mock, offline), takrorlash kerak mavzular                        | BR-PA01     | T-069, T-073, T-114 | ✅    |
| FR-G04 | Ota-onaga hisobot: haftalik va mock natijasi                                                                                        |             | T-035, T-082        | ✅    |
| FR-G05 | Ustozdan eʼlon: qabul qilingan o'quvchilar va tasdiqlangan ota-onalarga (guruh bo'yicha), oldindan soni bilan; yuborilganlar tarixi |             | T-116, T-117        | ✅    |

## To'lov (FR-B)

| ID     | Talab                                                           | BR          | T            | Holat |
| ------ | --------------------------------------------------------------- | ----------- | ------------ | ----- |
| FR-B01 | Qo'lda to'lov: tarif, karta, chek rasmi, tasdiq yoki rad, obuna | BR-B01..B05 | T-025        | ✅    |
| FR-B03 | Obuna tugashi haqida eslatma: o'quvchi va ota-onaga             | BR-B06      | T-090        | ✅    |
| FR-B04 | Oylik tushum: tasdiqlangan to'lovlar, tariflar bo'yicha, Excel  | BR-B05      | T-109        | ✅    |
| FR-B05 | Ota-ona farzandi uchun toʻlaydi: tarif, karta, chek, holat      | BR-B07      | T-120, T-121 | ✅    |
| FR-B02 | Click va Payme orqali to'lov                                    |             |              | ⬜    |

## Ustoz uchun (FR-U)

| ID     | Talab                                                                                                         | BR     | T                          | Holat |
| ------ | ------------------------------------------------------------------------------------------------------------- | ------ | -------------------------- | ----- |
| FR-U01 | Bosh sahifa: kutayotgan ishlar, menyu belgilari va muvaffaqiyat o'lchovlari                                   |        | T-061, T-105               | ✅    |
| FR-U02 | "E'tibor kerak" o'quvchilar faktli sabab bilan; o'quvchi kartasi (haftalik, mock natijalari va cheklar bilan) | BR-R02 | T-063, T-068, T-111, T-112 | ✅    |
| FR-U03 | O'quvchiga faktli tavsiya: kuchsiz mavzular, dars va testga havola                                            | BR-R01 | T-062                      | ✅    |
| FR-U04 | Audit jurnali: kim, qachon, nimani o'zgartirdi (bo'lim va xodim bo'yicha filtr)                               | BR-C04 | T-075                      | ✅    |
| FR-U05 | Axlat qutisi: o'chirilgan kurs, mavzu, dars va savolni 30 kun ichida qaytarish                                | BR-C06 | T-099                      | ✅    |
| FR-U06 | O'quvchilar ro'yxatida "To'lamagan" filtri va obuna muddati (Excel'da ham)                                    | BR-A04 | T-110                      | ✅    |

## Nofunksional (NFR)

| ID     | Talab                                                          | Qanday tekshiriladi                      |
| ------ | -------------------------------------------------------------- | ---------------------------------------- |
| NFR-01 | RBAC faqat backend'da; har endpoint'da `@Roles` yoki `@Public` | API e2e "ruxsat yo'q" testlari           |
| NFR-02 | Test paytida to'g'ri javob kliyentga chiqmaydi                 | API testlari (BR-Q01, BR-P03)            |
| NFR-03 | WCAG AA: kunduzgi va tungi rejim                               | `e2e/a11y*.spec.ts` (axe)                |
| NFR-04 | Mini App 360px, tugmalar ≥44px; admin telefonda ishlaydi       | Playwright (Pixel 7) skrinshotlari       |
| NFR-05 | Kunlik zaxira, 90 kun va 2 yil saqlash, o'chirib bo'lmaydi     | `scripts/backup.sh`, `06-infrastructure` |
| NFR-06 | Sirlar faqat `.env` da, env Zod bilan tekshiriladi             | `apps/api/src/config/env.ts`             |
| NFR-07 | `main` faqat yashil CI bilan, deploy avtomatik                 | GitHub Actions                           |
