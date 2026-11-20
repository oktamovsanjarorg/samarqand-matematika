# 04: Biznes qoidalar (BR)

> Har qoidaga ID beriladi. Qoidaga tegadigan testning nomida shu ID turadi (`BR-W03: ...`).
> ✅ tasdiqlangan · ⚠️ standart taklif (ustoz tasdig'i kutilmoqda, `10-open-questions.md`)

## Kirish va rollar (A)

| ID     | Qoida                                                                                                                                            | Holat                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| BR-A01 | Mini App'ga kirish faqat Telegram `initData` orqali bo'ladi. Imzo serverda HMAC bilan tekshiriladi, initData 24 soatdan eski bo'lmasligi kerak   | ✅                      |
| BR-A02 | `OWNER_USERNAMES` dagi username'lar `TEACHER` bo'ladi. Qolganlar `STUDENT` bo'lib yaratiladi                                                     | ✅                      |
| BR-A03 | Bloklangan hisobning tokeni keyingi so'rovdayoq kuchini yo'qotadi. Rol har so'rovda bazadan olinadi                                              | ✅                      |
| BR-A04 | To'liq pullik kirish uchun uchta shart bor: ustoz qabul qilgan, ota-ona tasdiqlagan, to'lov qilingan. Istisnoni ustoz qo'lda belgilaydi (BR-S03) | ✅ (ona tilidagi qoida) |

## O'quvchi profili (S)

| ID     | Qoida                                                                                                                                                                                                                                                                                                      | Holat |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| BR-S01 | Ism-familiyani o'quvchi o'zi kiritadi (kamida ikki so'z, faqat harflar). Ustoz qabul qilgandan keyin ismni faqat ustoz yoki yordamchi o'zgartiradi (409 `NAME_LOCKED`). Ism auditga yozilmaydi                                                                                                             | ✅    |
| BR-S02 | Telefon faqat Telegram'ning "raqamni ulashish" tugmasi orqali, o'z raqami bo'lsa (`contact.user_id` = yuboruvchi) saqlanadi. Qo'lda yozilgan yoki boshqa odamning raqami qabul qilinmaydi                                                                                                                  | ✅    |
| BR-S03 | Ustoz yangi o'quvchini "qabul qiladi". Kirish rejimi: AUTO (BR-A04 shartlari), FREE (ustoz shartlarsiz ochib bergan, masalan ota-onasida Telegram yo'q), CLOSED (yopilgan)                                                                                                                                 | ✅    |
| BR-S04 | Ilova ism yoki telefon yo'q o'quvchiga avval onboarding'ni ko'rsatadi. Ikkalasi ham kiritilgach ustoz va yordamchilarga bir marta "yangi o'quvchi" xabari boradi                                                                                                                                           | ✅    |
| BR-S05 | Ota-ona faqat o'quvchining havolasi (`/ota`) va o'z raqami bilan ulanadi. So'rov ustoz tasdig'iga tushadi, ustozga va o'quvchining o'ziga xabar boradi. Bitta o'quvchiga ko'pi bilan 2 ta faol ota-ona. Rad etilgan ota-ona qayta so'rov yubora olmaydi, ustoz qabul qilgan o'quvchi ota-ona bo'la olmaydi | ✅    |
| BR-S06 | Shubha belgilari (raqam o'quvchiniki bilan bir xil, hisob test ishlagan, ko'p bolaga ulanmoqda) ustozga ko'rsatiladi, belgilangan so'rovlar navbatda birinchi turadi                                                                                                                                       | ✅    |

## Kontent (C)

| ID     | Qoida                                                                                                                                                                                                      | Holat |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| BR-C01 | O'quvchi faqat nashr qilingan kurs va darslarni ko'radi. Nashr qilinmagan darsni to'g'ridan-to'g'ri havola bilan ham ochib bo'lmaydi (404). Darsi ham, nashr qilingan savoli ham yo'q mavzu ko'rsatilmaydi | ✅    |
| BR-C02 | Bepul dars (`isFree`) hammaga ochiq. Pullik dars faqat to'liq kirish (BR-A04) bilan ochiladi, aks holda 403 `LOCKED` qaytadi va matn yuborilmaydi. Ustoz va yordamchida doim bor                           | ✅    |
| BR-C03 | Ichida mavzu bor kursni yoki ichida dars bor mavzuni o'chirib bo'lmaydi (409 `NOT_EMPTY`)                                                                                                                  | ✅    |
| BR-C04 | Kontentni ustoz ham, yordamchi ham boshqaradi. Har o'zgarish auditga yoziladi, dars matni esa auditga yozilmaydi (faqat o'zgargan maydon nomlari)                                                          | ✅    |

## Savollar (Q)

| ID     | Qoida                                                                                                                                                               | Holat |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| BR-Q01 | To'g'ri javob va namunaviy yechim alohida ustunda saqlanadi. O'quvchi ko'rinishi uchun bu ustunlar bazadan o'qilmaydi, audit jurnaliga ham yozilmaydi               | ✅    |
| BR-Q02 | Ko'p tanlovli savol faqat tanlangan to'plam aynan to'g'ri to'plamga teng bo'lsa to'g'ri. Qisman ball yo'q                                                           | ⚠️    |
| BR-Q03 | Avtomatik tekshiruv: SINGLE, MULTIPLE, NUMERIC (BR-M04), MATCHING (BR-M03). EXPRESSION hozircha ustozga tushadi (ifoda ekvivalentligi T-022b), WRITTEN doim ustozga | ✅    |

## Mavzu testi (P)

| ID     | Qoida                                                                                                                                                | Holat |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| BR-P01 | Mavzu testi mashq: vaqt limiti yo'q, topshirgandan keyin qayta ishlash mumkin. Ochiq urinish bo'lsa, yangisi o'rniga o'sha davom etadi               | ⚠️    |
| BR-P02 | Testga boshlanganda nashr qilingan savollar muzlatiladi. Keyin qo'shilgan savol shu urinishga kirmaydi                                               | ✅    |
| BR-P03 | Topshirilguncha to'g'ri javob va yechim yuborilmaydi (BR-Q01). Topshirgandan keyin har savol bo'yicha to'g'ri javob va namunaviy yechim ko'rsatiladi | ✅    |
| BR-P04 | Mavzu testi to'liq kirish (BR-A04) bilan ochiladi, aks holda 403 `LOCKED`                                                                            | ⚠️    |
| BR-P05 | O'quvchi faqat o'z urinishini ko'radi; boshqaniki 404. Urinishda ishlatilgan savol o'chirilmaydi (409), nashrdan olinadi                             | ✅    |

## To'lov va obuna (B)

| ID     | Qoida                                                                                                                                                                   | Holat |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| BR-B01 | Qo'lda to'lov: o'quvchi tarifni tanlaydi, ustoz kartasiga o'tkazadi va chek rasmini yuboradi. Karta raqami bazada (admin sozlaydi), repoda emas; auditga oxirgi 4 raqam | ✅    |
| BR-B02 | Chek faqat JPG, PNG yoki WEBP, 5 MB gacha; turi baytlardan aniqlanadi. Bir o'quvchida bir vaqtda bitta kutilayotgan chek. Tekshirilguncha o'quvchi bekor qila oladi     | ✅    |
| BR-B03 | Tasdiqlangan chek obuna ochadi: faol obuna bo'lsa uning oxiridan uzayadi, kun yo'qolmaydi. Faol obuna BR-A04 dagi "to'lov qilingan" shartidir                           | ✅    |
| BR-B04 | Rad etish sababi majburiy va o'quvchiga bot orqali boradi. Bir chek ikki marta tekshirilmaydi (409)                                                                     | ✅    |
| BR-B05 | Cheklarni ustoz va yordamchi tekshiradi. Tarif va karta sozlamasi faqat ustozda                                                                                         | ✅    |

## Haftalik test (W)

| ID     | Qoida                                                                                                                                                                                              | Holat            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| BR-W01 | Haftalik test oynasi 1 hafta ochiq turadi (masalan dushanba 00:00 dan yakshanba 23:59 gacha, Asia/Tashkent)                                                                                        | ✅               |
| BR-W02 | O'quvchi bitta testni bir marta topshiradi                                                                                                                                                         | ✅               |
| BR-W03 | Javob va yechim rasmi oyna yopilguncha topshirilmagan bo'lsa, ball 0 bo'ladi                                                                                                                       | ✅               |
| BR-W04 | To'g'ri javob belgilangan, lekin yechimi yuklanmagan savol 0 deb hisoblanadi                                                                                                                       | ✅ Q-04 standart |
| BR-W05 | AI "ko'chirishga shubha" desa, bu o'quvchiga **ko'rsatilmaydi**. Savol ustozning navbatiga tushadi va qarorni ustoz qabul qiladi                                                                   | ✅               |
| BR-W06 | AI hukmi taklif xolos. Yakuniy ballni ustoz tasdiqlaydi yoki o'zgartiradi                                                                                                                          | ✅               |
| BR-W07 | Oyna yopilishidan 24 va 3 soat oldin topshirmaganlarga eslatma yuboriladi                                                                                                                          | ✅               |
| BR-W08 | Natija va reyting oyna yopilgandan keyin ochiladi                                                                                                                                                  | ✅               |
| BR-W09 | Haftalik test to'liq kirish (BR-A04) bilan ochiladi. Kimdir boshlagan testning savollari o'zgarmaydi va test o'chirilmaydi (409)                                                                   | ✅               |
| BR-W10 | Reyting: test bo'yicha ball, umumiy reytingda yopilgan testlar ballari yig'indisi. Teng ballga teng o'rin. O'quvchi top-10 va o'z o'rnini ko'radi, boshqalarning ismi qisqartirilgan ("Aliyev B.") | ✅ Q-10 standart |

## AI yordamchi (T)

| ID     | Qoida                                                                                                                | Holat                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| BR-T01 | Haftalik test yoki Mock ochiq turganda AI yordamchi shu testning savollari bo'yicha yordam bermaydi                  | ✅                                         |
| BR-T02 | Mashq rejimida yordamchi avval ishora beradi. To'liq yechimni faqat o'quvchi o'zi urinib ko'rgandan keyin ko'rsatadi | ✅                                         |
| BR-T03 | Har o'quvchiga kunlik so'rov limiti qo'yiladi                                                                        | ✅ Q-06 standart (`TUTOR_DAILY_LIMIT`, 30) |
| BR-T04 | Barcha suhbatlar saqlanadi, ustoz ko'ra oladi                                                                        | ✅                                         |

## Imtihon formati (M)

| ID     | Qoida                                                                                                                         | Holat                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| BR-M01 | Mock tuzilmasi (bo'limlar, savol turlari, ballar, daraja chegaralari) kodga yozilmaydi, "imtihon shabloni" sozlamasida turadi | ✅                                    |
| BR-M02 | Milliy sertifikat darajalari (75 ballik T-shkala): A+ 70+, A 65, B+ 60, B 55, C+ 50, C 46. 46 dan past bo'lsa sertifikat yo'q | ⚠️ Q-09 (rasmiy PDF bilan tekshirish) |
| BR-M03 | Moslashtirish savolida ball faqat barcha kichik savollar to'g'ri bo'lsa beriladi                                              | ⚠️ Q-09                               |
| BR-M04 | Son javobi ekvivalentlik bo'yicha tekshiriladi: `3/4`, `0.75` va `0,75` teng hisoblanadi                                      | ✅                                    |
