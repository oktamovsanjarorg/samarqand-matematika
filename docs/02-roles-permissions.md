# 02: Rollar va ruxsatlar

> Manba: controller'lardagi `@Roles()` va `@Public()`. Global `AuthGuard` har so'rovda rolni bazadan oladi (BR-A03).
> Yangi endpoint qo'shilsa, shu jadval va "ruxsat yo'q" testi bir PR'da yangilanadi.

## Rollar

| Rol         | Kim                 | Qanday beriladi                                                    |
| ----------- | ------------------- | ------------------------------------------------------------------ |
| `TEACHER`   | Ustoz (ega)         | `.env`: `OWNER_TELEGRAM_IDS`, `OWNER_USERNAMES` (BR-A02)           |
| `ASSISTANT` | Yordamchi (shogird) | Ustoz Sozlamalar → Yordamchilar (BR-A05, T-086)                    |
| `STUDENT`   | O'quvchi            | Botga yoki Mini App'ga birinchi kirganda                           |
| `PARENT`    | Ota-ona             | Farzandining `/ota` havolasi orqali, ustoz tasdig'i bilan (BR-S05) |

O'quvchining pullik kontentga kirishi rol bilan emas, BR-A04 shartlari bilan belgilanadi (`AccessService`). Ustoz va yordamchida kirish doim bor.

## Ruxsatlar matritsasi

✅ ruxsat · — yo'q (403)

| Endpoint guruhi                                                                                | TEACHER | ASSISTANT | STUDENT | PARENT |
| ---------------------------------------------------------------------------------------------- | :-----: | :-------: | :-----: | :----: |
| `admin/courses`, `topics`, `lessons`, `reorder` (kontent)                                      |   ✅    |    ✅     |    —    |   —    |
| `admin/topics/:id/questions`, `admin/questions` (savollar)                                     |   ✅    |    ✅     |    —    |   —    |
| `admin/trash` (axlat qutisi, tiklash)                                                          |   ✅    |    ✅     |    —    |   —    |
| `admin/students` (ro'yxat, karta, qabul, kirish rejimi)                                        |   ✅    |    ✅     |    —    |   —    |
| `admin/parent-links` (ota-ona so'rovlari)                                                      |   ✅    |    ✅     |    —    |   —    |
| `admin/payments` (cheklar, tasdiq, rad)                                                        |   ✅    |    ✅     |    —    |   —    |
| `admin/plans`, `admin/billing-card` (tarif, karta)                                             |   ✅    |     —     |    —    |   —    |
| `admin/exam-templates` o'qish                                                                  |   ✅    |    ✅     |    —    |   —    |
| `admin/exam-templates` yaratish va tahrirlash                                                  |   ✅    |     —     |    —    |   —    |
| `admin/weekly` (test, natija, tekshiruv navbati, ball)                                         |   ✅    |    ✅     |    —    |   —    |
| `admin/mocks` (mock, natijalar)                                                                |   ✅    |    ✅     |    —    |   —    |
| `admin/groups` (guruh, a'zolar, davomat)                                                       |   ✅    |    ✅     |    —    |   —    |
| `admin/offline-tests` (CSV import)                                                             |   ✅    |    ✅     |    —    |   —    |
| `admin/tutor/chats` (o'quvchi suhbatlari)                                                      |   ✅    |    ✅     |    —    |   —    |
| `admin/dashboard`, `admin/attention`                                                           |   ✅    |    ✅     |    —    |   —    |
| `admin/audit` (jurnal)                                                                         |   ✅    |     —     |    —    |   —    |
| `admin/staff` (yordamchilar)                                                                   |   ✅    |     —     |    —    |   —    |
| `admin/income` (oylik tushum, T-109)                                                           |   ✅    |     —     |    —    |   —    |
| `admin/broadcast` (eʼlon yuborish, T-116)                                                      |   ✅    |     —     |    —    |   —    |
| `me/profile`, `me/name`, `me/stats`, `me/mistakes`, `me/recommendations`, `me/offline-results` |    —    |     —     |   ✅    |   —    |
| `topics/:id/attempts`, `attempts/*` (mavzu testi)                                              |    —    |     —     |   ✅    |   —    |
| `billing` (tarif tanlash, chek yuborish)                                                       |    —    |     —     |   ✅    |   —    |
| `weekly`, `weekly-attempts/*`, `weekly-ranking`                                                |   ✅    |    ✅     |   ✅    |   —    |
| `mocks`, `mock-attempts/*`                                                                     |   ✅    |    ✅     |   ✅    |   —    |
| `tutor/chats` (AI yordamchi)                                                                   |   ✅    |    ✅     |   ✅    |   —    |
| `me/children`, `me/children/:id` (ota-ona kabineti)                                            |    —    |     —     |    —    |   ✅   |
| `me`, `me/school`, `courses`, `lessons/:id`                                                    |   ✅    |    ✅     |   ✅    |   ✅   |

Ustoz va yordamchi o'quvchi oqimlarini (haftalik, mock, yordamchi) sinab ko'rish uchun ochishi mumkin.

## Ochiq (`@Public`) endpoint'lar

| Endpoint                                                                           | Himoya                                                                            |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `POST auth/telegram`                                                               | `initData` HMAC imzosi, 24 soatlik muddat (BR-A01), rate limit                    |
| `POST auth/admin-link`                                                             | Bir martalik, 5 daqiqalik token (T-010)                                           |
| `GET health`                                                                       | Hech narsa qaytarmaydi, faqat holat                                               |
| `POST internal/*` (`admin-login-link`, `parent-code`, `parent-link`, `user-phone`) | Faqat bot: `InternalGuard` (`x-internal-key`, bot tokenidan hosil qilingan kalit) |

## Ma'lumot ko'rinishi bo'yicha qoidalar

- To'g'ri javob va namunaviy yechim o'quvchiga test topshirilguncha (haftalik va mockda oyna yopilguncha) yuborilmaydi (BR-Q01, BR-P03, BR-W08).
- AI shubhasi va signallar faqat `admin/weekly/:id/review` da (BR-W05).
- O'quvchi faqat o'z urinishini ko'radi, boshqaniki 404 (BR-P05). Ota-ona faqat tasdiqlangan farzandini (BR-PA01).
- Reytingda boshqalarning ismi qisqartirilgan (BR-W10).
- Audit jurnalida ism, telefon, javob kaliti va dars matni yo'q, faqat o'zgargan maydon nomlari (BR-C04, BR-S01, BR-Q01).
