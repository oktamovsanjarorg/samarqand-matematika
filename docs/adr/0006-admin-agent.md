# ADR-0006: Admin panel AI agenti

- Sana: 2026-11-22 · Holat: qabul qilindi (haqiqiy kalit bilan sinov ustoz roziligidan keyin, Q-03)

## Kontekst

Ustoz panelda ko'p ishni qo'lda qiladi: o'quvchini topish va qabul qilish, mavzu va savol qo'shish, haftalik test tuzish, cheklarni ko'rish, e'lon yuborish. Ustoz bu ishlarni oddiy so'z bilan buyurib, bajartirmoqchi.

## Qaror

- **Claude Messages API, asboblar bilan, o'zimizning tsiklimiz** (`apps/api/src/agent/`). Managed Agents tanlanmadi. Sabablari: asboblar sandbox'da emas, bizning backend'da ishlaydi; har asbob foydalanuvchining o'z huquqi bilan bajarilishi kerak; loyihada Messages API integratsiyasi (ADR-0004) allaqachon bor.
- **Asbob = mavjud admin endpoint.** Agent `fastify.inject` orqali foydalanuvchining o'z tokeni bilan chaqiradi. Shu sabab RBAC (`@Roles`), Zod tekshiruvi va audit jurnali panel bilan bir xil ishlaydi. Yordamchi agent orqali ham ustozning amalini bajara olmaydi (403 agentga qaytadi).
- **O'zgartiruvchi amal faqat tasdiq bilan bajariladi.** Model yozish asbobini chaqirsa, server bajarmaydi. U HMAC bilan imzolangan token qaytaradi, token shu foydalanuvchi, shu `tool_use` va shu argumentlarga bog'langan, muddati 30 daqiqa, bir martalik. Ustoz "Tasdiqlash"ni bosgach bajariladi. Rad etilsa, model bu haqda xabar oladi. Bir qadamda bitta asbob ishlaydi (`disable_parallel_tool_use`).
- **Oldindan ko'rish:** savol qo'shish va e'lon avval `dryRun` bilan sinaladi. Savolda xato bo'lsa, tasdiq oynasi chiqmaydi: xato agentga qaytadi va u tuzatadi. Tasdiq oynasida necha savol o'tgani yoki e'lon necha kishiga borishi ko'rinadi.
- **Suhbat serverda saqlanmaydi:** kliyent uni har so'rovda qaytaradi. Asbob natijasidan telefon raqamlari olib tashlanadi.
- **AI baho qo'ymaydi.** Baho qo'yadigan asbob yo'q, tekshiruv navbati faqat ko'rsatiladi.
- Model `AI_MODEL` (standart `claude-opus-5-5`). `effort: medium` ishlatiladi. Rad etilsa server zaxira modelda urinadi (`fallbacks: "default"`). Tizim promptining o'zgarmas qismi keshlanadi.
- Har xodimga kunlik chegara: `AGENT_DAILY_LIMIT` (standart 200 ta model chaqiruvi).

## Oqibatlar

- `AI_PROVIDER=off` bo'lsa sahifa "AI oʻchiq" deydi, panel odatdagidek ishlaydi.
- Yangi admin endpoint qo'shilsa, agentga asbob alohida qo'shiladi (`read-tools.ts` / `write-tools.ts`).
- Testlarda model soxta (`testAgent`), pullik chaqiruv yo'q. Haqiqiy model bilan sifat sinovi kalit va ustoz roziligi bilan o'tkaziladi.
