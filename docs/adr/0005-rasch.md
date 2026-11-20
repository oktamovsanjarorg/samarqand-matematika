# ADR-0005: Mock natijasi va Rasch

- Sana: 2026-11-20 · Holat: qabul qilindi (qiyalik haqiqiy milliy natijalar bilan tekshiriladi, Q-09)

## Kontekst

Milliy sertifikat natijasi Rasch modelida, 75 ballik T-shkalada beriladi; shkalani yuz minglab qatnashchi ushlab turadi. Bitta ustozning guruhi kichik: o'z guruhi bo'yicha `T = 50 + 10Z` har safar o'rtachani 50 ga tortadi va guruh kuchaysa ham o'sish ko'rinmaydi (ona tili loyihasida 88 kishilik mockda ham o'rtacha aynan 50 chiqqan).

## Qaror

- Mock yopilganda (`MockScheduler`, har daqiqa) vaqti o'tgan urinishlar saqlangan javoblar bilan topshiriladi, keyin shkala balli `MockAttempt.scaled` ga yoziladi va o'quvchiga bot xabari boradi.
- **Topshirganlar 30 dan kam** (`RASCH_MIN_SAMPLE`): taxminiy ball = xom ball / eng yuqori xom ball × shkala (BR-M05), natijada "taxminiy" deyiladi.
- **30 va undan ko'p**: `packages/math/rasch.ts`. JMLE bilan savol qiyinliklari (`MockQuestion.raschB`); ball esa mutlaq: qiyinlikdan og'irlik `exp(0.25 · clamp(z(b), ±2))`, `T = 50 + 14 · logit((Σ javob·og'irlik + 0.5) / (Σ og'irlik + 1))`, 0..75, boshqa shkalaga mutanosib. Guruh faqat savol qiyinligini aytadi, ball guruh o'rtachasiga bog'liq emas.
- Qiyalik 14 ona tili va utest natijalarida tanlangan (teng savollarda C ≈ 43%, A+ ≈ 81%). Haqiqiy milliy natijalar yig'ilsa tekshiriladi.
- Kalibrlash Rasch'da savol to'g'ri/xato (0/1) bo'yicha; xom ball esa shablondagi bo'lim ballari bilan alohida ko'rsatiladi.

## Oqibatlar

- Natija oyna yopilgandan keyin bir marta hisoblanadi; ochilgandan to yopilish tick'igacha (≤ 1 daqiqa) ko'rinish taxminiy formuladan olinadi.
- Rasch kod, ma'lumot va testlari bitta joyda (`packages/math`), API faqat matritsa beradi (`mock-scoring.ts`).
