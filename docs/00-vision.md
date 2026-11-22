# 00: Maqsad (vision)

## Nima uchun

Ustoz va uning yordamchilari matematikadan o'quvchilarni (abituriyentlar, maktab o'quvchilari; online va offline guruhlar) Milliy sertifikatga va o'qishga tayyorlaydi.
Platforma uchta muammoni hal qiladi:

1. **O'quvchi o'zi ishlashi kerak.** Oddiy chatbotlardan tayyor javob ko'chirilmoqda. Haftalik testda yechim rasmi talab qilinadi, AI ko'chirish belgilarini qidiradi, qarorni ustoz qabul qiladi.
2. **Ustozning vaqti tejalishi kerak.** Tekshirish, reyting, ota-onaga hisobot va eslatmalar avtomatik. Ustoz faqat qaror kerak bo'lgan joyni ko'radi.
3. **Ota-ona ko'rib turishi kerak.** Davomat, natijalar va takrorlash kerak mavzular botga va kabinetga keladi.

## Kimlar uchun

| Foydalanuvchi | Qayerda            | Asosiy ehtiyoj                                                                         |
| ------------- | ------------------ | -------------------------------------------------------------------------------------- |
| O'quvchi      | Telegram Mini App  | Darslar, mashq, haftalik test va mock, xatolar ustida ishlash, o'rgatuvchi yordamchi   |
| Ota-ona       | Mini App va bot    | Farzandining davomati, natijalari, nima ustida ishlash kerakligi                       |
| Ustoz         | Admin panel va bot | Kontent, testlar, tekshirish navbati, o'quvchilar, to'lovlar, sozlamalar               |
| Yordamchi     | Admin panel va bot | Ustozning kundalik ishini bo'lishish (tariflar, karta, jurnal va xodimlardan tashqari) |

## Tamoyillar

- **Oxirgi so'z ustozda.** AI baho qo'ymaydi, faqat taklif beradi. AI o'chiq bo'lsa ham hamma oqim ishlaydi.
- **Shubha ayblov emas.** Ko'chirishga shubha o'quvchiga ko'rinmaydi, faqat ustoz navbatiga tushadi (BR-W05).
- **Faktlar, umumiy gap emas.** Tavsiyalar raqamlar va sabab bilan beriladi (BR-R01, BR-R02).
- **Halollik texnik jihatdan ta'minlanadi.** Test paytida to'g'ri javob kliyentga chiqmaydi, vaqt server bo'yicha hisoblanadi.
- **Telefonda qulay.** Mini App 360px kenglikda, admin panel telefonda ham ishlaydi.
- **Shaxsiy ma'lumot himoyalangan.** Repoda va logda shaxsiy ma'lumot yo'q, audit faqat zarur maydonlarni yozadi.

## Muvaffaqiyat o'lchovi

- Haftalik testni oyna ichida topshirgan to'liq kirishli o'quvchilar ulushi (admin bosh sahifasi, T-105).
- Ustozning haftalik tekshiruvga sarflagan vaqti (navbatda qolgan javoblar soni, T-084 hisoboti).
- Kuchsiz mavzu bo'yicha keyingi urinishda natija o'sishi: 30 kunda qayta ishlangan mavzu testlarining necha foizida natija oshgani (admin bosh sahifasi, T-133).
- Ota-onalarning ulanganlik ulushi (BR-A04 sharti; admin bosh sahifasi, T-105).

## Hozircha qilinmaydi

- Og'zaki himoya (yozma variant rad etilgan, PLAN §6).
- Click va Payme (qo'lda chek bilan boshlangan, `PaymentProvider` keyin).
- Himoyalangan HLS video (darsda oddiy havola).
- Word'dan import (T-026, pandoc kerak). Excel (CSV) importi bor (T-100).
- Gamification.
